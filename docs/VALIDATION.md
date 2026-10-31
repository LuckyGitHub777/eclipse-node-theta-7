# Validation Record

**Artifact:** Eclipse Node Theta-7 v1.2.2
**Validation date:** 2026-10-31
**Environment:** Linux container, Node.js 22, Python 3, Playwright 1.57.0, Chromium (localhost delivery)

## Results

| Validation area | Result |
|---|---:|
| Static repository tests | 16 of 16 PASS |
| Chromium interaction checks | 59 of 59 PASS |
| Workflow YAML parsing | 1 of 1 PASS |
| JavaScript syntax | PASS |
| Local asset resolution | PASS |
| Static-server readback | PASS |
| npm production audit | 0 vulnerabilities |
| Console errors | 0 |
| Page errors | 0 |
| Public static copy | 298 words |
| Desktop horizontal overflow | None detected |
| Mobile horizontal overflow | None detected |
| Mobile control order | Controls precede the sigil |
| Minimum visible button height on mobile | At least 44 px |

## Behaviors exercised

- Clean ready state after mode selection
- User-paced seven-question sequence
- No automatic question advancement
- Pause and resume without losing the current question
- Clean ready state after mode changes from active or complete sessions
- Breathing content isolated to Breathe mode
- Guided-breath pause, resume, and reset
- Sound toggle, conditional volume control, and immediate audio stop
- Reduced-motion toggle and system preference
- Browser reflection save, local download, protected delete, and storage removal
- Directly opened (`file://`) copy: tab-only reflections, honest save message, shared-storage recovery and removal, unsaved-work prompt
- Hosted copy: unsaved-work prompt, cleared by saving
- Responsive desktop and mobile rendering
- 404 copy, status, and return-home behavior

## Repository controls exercised

- Required-file inventory
- Version consistency
- JavaScript syntax
- Local asset references
- Remote-runtime and network-API prohibition
- Public copy-length limit
- Privacy and use-boundary presence
- Three modes, seven questions, and seven generated nodes
- Mobile controls-before-stage structure
- Accessibility landmarks and target sizing
- Unique identifiers and valid internal links
- Web manifest and local icon resolution
- Breathing and audio safeguards
- Single-CI workflow permissions and pinned Action references
- YAML parsing
- npm production audit

## Delivery

Browser checks ran against the local static server over normal localhost navigation, with real browser-origin persistence, and against the directly opened `site/index.html`. GitHub-hosted continuous integration runs the same suite on every push to `main`.

GitHub Pages deployment completed successfully from `main` commit `142de7964e802c233225d0a731ec100e4ec4289d` in workflow run `41233898708`, publishing `site/` to `https://luckygithub777.github.io/eclipse-node-theta-7/`. The deployment runner reported the environment URL and completed successfully.

Safari, Firefox, physical phones, and a formal assistive-technology audit remain external checks.

`npm run test:browser` emits the detailed browser-result JSON and temporary screenshots at runtime; `VALIDATION_RESULTS.json` records the controlling local summary.
