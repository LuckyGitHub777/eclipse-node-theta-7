#!/usr/bin/env python3
import base64
import json
import os
import re
import socket
import subprocess
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = Path(tempfile.gettempdir()) / "theta7-browser-evidence"
EVIDENCE.mkdir(parents=True, exist_ok=True)


def harness_content():
    site = ROOT / "site"
    html = (site / "index.html").read_text(encoding="utf-8")
    css = (site / "assets/css/styles.css").read_text(encoding="utf-8")
    js = (site / "assets/js/app.js").read_text(encoding="utf-8")
    image = base64.b64encode((site / "assets/img/theta7-sigil.svg").read_bytes()).decode("ascii")
    html = re.sub(r'\s*<link rel="(?:icon|manifest|stylesheet)"[^>]*>', "", html)
    html = re.sub(r'\s*<script src="assets/js/app\.js" defer></script>', "", html)
    html = html.replace('src="assets/img/theta7-sigil.svg"', f'src="data:image/svg+xml;base64,{image}"')
    html = html.replace("</head>", f"<style>{css}</style></head>")
    html = html.replace("</body>", f"<script>{js}</script></body>")
    return html


def install_storage_shim(page):
    page.evaluate("""
      () => {
        const values = new Map();
        const storage = {
          getItem: key => values.has(String(key)) ? values.get(String(key)) : null,
          setItem: (key, value) => values.set(String(key), String(value)),
          removeItem: key => values.delete(String(key)),
          clear: () => values.clear(),
          key: index => [...values.keys()][index] ?? null,
          get length() { return values.size; }
        };
        Object.defineProperty(window, "localStorage", { value: storage, configurable: true });
      }
    """)


def load_harness(page):
    install_storage_shim(page)
    page.set_content(harness_content(), wait_until="load")
    page.wait_for_function("window.__THETA7__ && window.__THETA7__.version === '1.2.2'")


def http_status(url):
    try:
        with urllib.request.urlopen(url, timeout=5) as response:
            return response.status
    except urllib.error.HTTPError as error:
        return error.code


def free_port():
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def wait_for_server(port, timeout=10):
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with socket.create_connection(("127.0.0.1", port), timeout=0.25):
                return
        except OSError:
            time.sleep(0.1)
    raise RuntimeError("Local server did not start")


def launch_browser(playwright):
    kwargs = {"headless": True, "args": ["--no-sandbox"]}
    configured = os.environ.get("CHROMIUM_PATH")
    if configured:
        kwargs["executable_path"] = configured
    elif Path("/usr/bin/chromium").exists():
        kwargs["executable_path"] = "/usr/bin/chromium"
    return playwright.chromium.launch(**kwargs)


def add_check(checks, name, value):
    checks[name] = bool(value)


def run():
    port = free_port()
    env = os.environ.copy()
    env["PORT"] = str(port)
    server = subprocess.Popen(
        ["node", "scripts/serve.mjs"],
        cwd=ROOT,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )

    try:
        wait_for_server(port)
        base = f"http://127.0.0.1:{port}"
        results = {"version": "1.2.2", "delivery": "localhost", "checks": {}, "environment": {}}
        checks = results["checks"]

        with sync_playwright() as p:
            browser = launch_browser(p)
            context = browser.new_context(viewport={"width": 1440, "height": 1000}, accept_downloads=True)
            page = context.new_page()
            console_errors = []
            page_errors = []
            page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)
            page.on("pageerror", lambda error: page_errors.append(str(error)))

            navigation_error = None
            delivery = "localhost"
            try:
                response = page.goto(base, wait_until="networkidle")
                page.wait_for_function("window.__THETA7__ && window.__THETA7__.version === '1.2.2'")
            except Exception as error:
                navigation_error = str(error)
                delivery = "in-memory browser harness"
                response = None
                page.close()
                page = context.new_page()
                page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)
                page.on("pageerror", lambda error: page_errors.append(str(error)))
                load_harness(page)

            results["delivery"] = delivery
            add_check(checks, "static_server_readback", http_status(base) == 200)
            add_check(checks, "title", page.title() == "Eclipse Node Theta-7 | Seven-Step Reflection")
            add_check(checks, "version", page.evaluate("window.__THETA7__.version") == "1.2.2")
            add_check(checks, "seven_nodes", page.locator(".theta-node").count() == 7)
            add_check(checks, "seven_questions", page.locator(".question-grid li").count() == 7)
            add_check(checks, "ready_status", page.locator("#sessionStatus").inner_text() == "Ready")
            add_check(checks, "start_label", page.locator("#startBtn").inner_text() == "Start")
            add_check(checks, "no_horizontal_overflow_desktop", page.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1"))

            # Selecting a mode must not create a paused or active session.
            page.locator('[data-mode="prompts"]').click()
            add_check(checks, "mode_selection_remains_ready", page.locator("#sessionStatus").inner_text() == "Ready")
            add_check(checks, "mode_selection_keeps_start", page.locator("#startBtn").inner_text() == "Start")
            add_check(checks, "prompts_not_started", page.locator("#progressText").inner_text() == "Not started")

            # User-paced question flow.
            page.locator("#startBtn").click()
            add_check(checks, "prompts_active", page.locator("#sessionStatus").inner_text() == "In progress")
            add_check(checks, "question_one", page.locator("#progressText").inner_text() == "Question 1 of 7")
            first_question = page.locator("#transmission").inner_text()
            page.wait_for_timeout(2700)
            add_check(checks, "questions_do_not_auto_advance", page.locator("#transmission").inner_text() == first_question)

            page.locator("#nextBtn").click()
            second_question = page.locator("#transmission").inner_text()
            add_check(checks, "next_question", page.locator("#progressText").inner_text() == "Question 2 of 7")

            page.locator("#startBtn").click()
            add_check(checks, "pause_status", page.locator("#sessionStatus").inner_text() == "Paused")
            add_check(checks, "next_hidden_while_paused", page.locator("#nextBtn").is_hidden())
            page.locator("#startBtn").click()
            add_check(checks, "resume_preserves_question", page.locator("#transmission").inner_text() == second_question)

            for _ in range(6):
                page.locator("#nextBtn").click()
            add_check(checks, "prompts_complete", page.locator("#sessionStatus").inner_text() == "Complete")
            add_check(checks, "breathing_unchanged_after_prompts", page.locator("#breathState").inner_text() == "Ready")

            # Changing mode after completion returns to a clean ready state.
            page.locator('[data-mode="observe"]').click()
            add_check(checks, "mode_change_after_complete_is_ready", page.locator("#sessionStatus").inner_text() == "Ready")
            add_check(checks, "mode_change_after_complete_start_label", page.locator("#startBtn").inner_text() == "Start")
            add_check(checks, "observe_hides_progress", page.locator("#progressTrack").is_hidden())

            # Changing mode while active also returns to ready.
            page.locator("#startBtn").click()
            page.locator('[data-mode="breathe"]').click()
            add_check(checks, "mode_change_while_active_is_ready", page.locator("#sessionStatus").inner_text() == "Ready")
            add_check(checks, "breathe_guide_visible", page.locator("#breathGuide").is_visible())

            # Breathing pause/resume preserves its phase countdown.
            page.locator("#startBtn").click()
            add_check(checks, "breathe_starts", page.locator("#breathState").inner_text() == "Inhale")
            page.wait_for_timeout(1150)
            page.locator("#startBtn").click()
            paused_count = page.locator("#breathCount").inner_text()
            page.wait_for_timeout(1150)
            add_check(checks, "breathe_pauses", page.locator("#breathCount").inner_text() == paused_count)
            page.locator("#startBtn").click()
            page.wait_for_timeout(1150)
            add_check(checks, "breathe_resumes", page.locator("#breathCount").inner_text() != paused_count)
            page.locator("#resetBtn").click()
            add_check(checks, "stop_reset_ready", page.locator("#sessionStatus").inner_text() == "Ready")
            add_check(checks, "stop_reset_breath_ready", page.locator("#breathCount").inner_text() == "4 · 2 · 6")

            # Optional sound and motion.
            page.locator(".options summary").click()
            page.locator("#audioBtn").click()
            add_check(checks, "sound_on", page.locator("#audioBtn").get_attribute("aria-pressed") == "true")
            add_check(checks, "volume_visible_when_sound_on", page.locator("#volumeControl").is_visible())
            page.locator("#volumeSlider").fill("55")
            add_check(checks, "volume_updates", page.locator("#volumeOutput").inner_text() == "55%")
            page.locator("#resetBtn").click()
            add_check(checks, "reset_preserves_sound_preference", page.locator("#audioBtn").get_attribute("aria-pressed") == "true")
            page.locator("#audioBtn").click()
            add_check(checks, "volume_hidden_when_sound_off", page.locator("#volumeControl").is_hidden())

            page.locator("#motionBtn").click()
            add_check(checks, "reduced_motion_toggle", page.locator("body").evaluate("node => node.classList.contains('motion-off')"))

            # Real browser-origin persistence and download.
            reflection = "Observed the image, separated interpretation from fact, and chose one reversible next step."
            page.locator("#journal").fill(reflection)
            page.locator("#saveBtn").click()
            add_check(checks, "reflection_saved", page.evaluate("localStorage.getItem('theta7.reflection.v1.2')") == reflection)
            with page.expect_download() as download_info:
                page.locator("#exportBtn").click()
            download = download_info.value
            add_check(checks, "reflection_download", download.suggested_filename.startswith("theta7-reflection-") and download.suggested_filename.endswith(".md"))
            page.locator("#clearBtn").click()
            add_check(checks, "delete_requires_confirmation", page.locator("#clearBtn").inner_text() == "Confirm delete")
            page.locator("#clearBtn").click()
            add_check(checks, "reflection_deleted", page.locator("#journal").input_value() == "" and page.evaluate("localStorage.getItem('theta7.reflection.v1.2')") is None)

            # Capture a clean initial state after interaction checks.
            page.set_viewport_size({"width": 1440, "height": 1000})
            if delivery == "localhost":
                page.reload(wait_until="networkidle")
                page.wait_for_function("window.__THETA7__ && window.__THETA7__.version === '1.2.2'")
            else:
                load_harness(page)
            page.evaluate("document.activeElement?.blur(); document.querySelector('.skip-link').style.display='none'; window.scrollTo(0, 0)")
            page.screenshot(path=EVIDENCE / "desktop.png", full_page=True)

            # Mobile layout: controls precede the large visual and targets remain usable.
            page.set_viewport_size({"width": 390, "height": 844})
            if delivery == "localhost":
                page.reload(wait_until="networkidle")
                page.wait_for_function("window.__THETA7__ && window.__THETA7__.version === '1.2.2'")
            else:
                load_harness(page)
            page.evaluate("document.activeElement?.blur(); document.querySelector('.skip-link').style.display='none'; window.scrollTo(0, 0)")
            controls_box = page.locator(".controls").bounding_box()
            stage_box = page.locator(".stage").bounding_box()
            add_check(checks, "mobile_controls_before_stage", bool(controls_box and stage_box and controls_box["y"] < stage_box["y"]))
            add_check(checks, "no_horizontal_overflow_mobile", page.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1"))
            target_heights = page.locator("button").evaluate_all("nodes => nodes.filter(node => !node.hidden).map(node => node.getBoundingClientRect().height)")
            add_check(checks, "mobile_button_targets", bool(target_heights) and min(target_heights) >= 44)
            page.screenshot(path=EVIDENCE / "mobile.png", full_page=True)

            # The themed 404 must lead back to the deployment root.
            not_found = context.new_page()
            add_check(checks, "404_status", http_status(f"{base}/missing/path") == 404)
            if delivery == "localhost":
                not_found.goto(f"{base}/missing/path", wait_until="load")
            else:
                not_found.set_content((ROOT / "site" / "404.html").read_text(encoding="utf-8"), wait_until="load")
            add_check(checks, "404_copy", not_found.locator("h1").inner_text() == "Page not found.")
            add_check(checks, "404_home_local", not_found.locator("#homeLink").get_attribute("href") == "/")
            not_found.close()

            # System reduced-motion preference is honored on first load.
            reduced_context = browser.new_context(viewport={"width": 800, "height": 700}, reduced_motion="reduce")
            reduced_page = reduced_context.new_page()
            if delivery == "localhost":
                reduced_page.goto(base, wait_until="networkidle")
                reduced_page.wait_for_function("window.__THETA7__ && window.__THETA7__.version === '1.2.2'")
            else:
                load_harness(reduced_page)
            add_check(checks, "system_reduced_motion", reduced_page.locator("body").evaluate("node => node.classList.contains('motion-off')"))
            reduced_context.close()

            # Directly opened copy (file://): reflections stay in the tab, shared storage is cleared.
            file_context = browser.new_context(accept_downloads=True)
            file_page = file_context.new_page()
            file_page.on("pageerror", lambda error: page_errors.append(str(error)))
            file_dialogs = []

            def accept_dialog(dialog):
                file_dialogs.append(dialog.type)
                dialog.accept()

            file_page.on("dialog", accept_dialog)
            file_url = (ROOT / "site" / "index.html").as_uri()
            file_page.goto(file_url, wait_until="load")
            file_page.wait_for_function("window.__THETA7__ && window.__THETA7__.version === '1.2.2'")
            add_check(checks, "file_mode_message", "stay in this tab only" in file_page.locator("#saveStatus").inner_text())
            file_page.locator("#journal").fill("File-mode reflection.")
            file_page.locator("#saveBtn").click()
            add_check(checks, "file_mode_save_not_shared", file_page.evaluate("localStorage.getItem('theta7.reflection.v1.2')") is None)
            add_check(checks, "file_mode_save_message_honest", "Kept in this tab only" in file_page.locator("#saveStatus").inner_text())
            file_page.reload(wait_until="load")
            add_check(checks, "file_mode_unsaved_prompt", file_dialogs.count("beforeunload") == 1)
            file_page.evaluate("localStorage.setItem('theta7.reflection.v1.2', 'Legacy shared reflection.')")
            file_page.reload(wait_until="load")
            add_check(checks, "file_mode_legacy_recovered", file_page.locator("#journal").input_value() == "Legacy shared reflection.")
            add_check(checks, "file_mode_legacy_removed", file_page.evaluate("localStorage.getItem('theta7.reflection.v1.2')") is None)
            with file_page.expect_download():
                file_page.locator("#exportBtn").click()
            before_prompts = file_dialogs.count("beforeunload")
            file_page.reload(wait_until="load")
            add_check(checks, "file_mode_download_clears_prompt", file_dialogs.count("beforeunload") == before_prompts)
            file_context.close()

            # Hosted copy: saving persists and clears the unsaved-work prompt.
            if delivery == "localhost":
                hosted_context = browser.new_context()
                hosted_page = hosted_context.new_page()
                hosted_dialogs = []

                def accept_hosted(dialog):
                    hosted_dialogs.append(dialog.type)
                    dialog.accept()

                hosted_page.on("dialog", accept_hosted)
                hosted_page.goto(base, wait_until="networkidle")
                hosted_page.locator("#journal").fill("Unsaved hosted reflection.")
                hosted_page.reload(wait_until="networkidle")
                add_check(checks, "hosted_unsaved_prompt", hosted_dialogs.count("beforeunload") == 1)
                hosted_page.locator("#journal").fill("Saved hosted reflection.")
                hosted_page.locator("#saveBtn").click()
                hosted_page.reload(wait_until="networkidle")
                add_check(checks, "hosted_save_clears_prompt", hosted_dialogs.count("beforeunload") == 1)
                add_check(checks, "hosted_save_persists", hosted_page.locator("#journal").input_value() == "Saved hosted reflection.")
                hosted_context.close()

            add_check(checks, "no_console_errors", not console_errors)
            add_check(checks, "no_page_errors", not page_errors)

            results["environment"] = {
                "browser": browser.version,
                "viewport_desktop": "1440x1000",
                "viewport_mobile": "390x844",
                "console_errors": console_errors,
                "page_errors": page_errors,
                "navigation_error": navigation_error,
            }
            browser.close()

        passed = sorted(name for name, value in checks.items() if value)
        failed = sorted(name for name, value in checks.items() if not value)
        results["passed"] = passed
        results["failed"] = failed
        (EVIDENCE / "browser-results.json").write_text(json.dumps(results, indent=2) + "\n", encoding="utf-8")
        print(json.dumps(results, indent=2))
        if failed:
            raise SystemExit(1)
    finally:
        server.terminate()
        try:
            server.wait(timeout=5)
        except subprocess.TimeoutExpired:
            server.kill()


if __name__ == "__main__":
    run()
