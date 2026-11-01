# Eclipse Node Theta-7

A self-contained seven-step reflection experience built with plain HTML, CSS, and JavaScript.

**Live experience:** https://luckygithub777.github.io/eclipse-node-theta-7/

![Eclipse Node Theta-7 Star Sigil](site/assets/img/theta7-sigil.svg)

## Experience

Theta-7 combines a seven-pointed eclipse sigil with three user-controlled modes:

- **Observe** for open-ended attention
- **7 Prompts** for seven practical questions at the user’s pace
- **Breathe** for seven guided 4-2-6 cycles

The interface also includes optional local tones, reduced-motion support, a tab-private reflection field on GitHub Pages, and local Markdown download.

## Run locally

Open `site/index.html` directly, or start the included static server:

```bash
npm ci
npm run serve
```

Then open `http://127.0.0.1:4173`.

## Validate

```bash
npm test
npm run test:browser
npm run verify:manifest
```

Browser testing requires Python 3, Chromium, and the pinned package in `requirements-browser.txt`.

## Privacy and use boundary

The application has no account, analytics, backend, or data upload. On `*.github.io` project sites and direct `file://` copies, reflections are kept in this tab's memory and lost on reload or close unless downloaded. An earlier version's unencrypted shared-origin reflection is recovered into tab memory and removed from shared storage upon visiting the updated site; visitors who never return may still have an old stored copy. Other hosted origins use browser-local unencrypted storage and may expose data to others sharing that profile. Use **Download** to keep a copy.

Theta-7 is symbolic art and reflective software. It does not verify paranormal, extraterrestrial, medical, or intelligence claims and should not guide health, safety, travel, or investigative decisions.

## Repository map

- `site/` deployable static experience
- `tests/` repository and browser interaction checks
- `scripts/` local server, manifest, and release packaging tools
- `docs/` architecture, validation, release, and use-boundary records
- `.github/workflows/ci.yml` minimal continuous validation

## Repository state

**Version:** 1.2.3
**License:** MIT
**Status:** Live on GitHub Pages. Continuous integration validates every push to `main`; only `site/` is published after CI passes.
