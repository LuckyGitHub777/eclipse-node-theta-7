# Validation Record

**Artifact:** Eclipse Node Theta-7 v1.2.1
**Validation date:** 2026-10-30
**Environment:** Linux container, Node.js 22.16.0, npm 10.9.2, Python 3.13.5, Playwright 1.57.0, Chromium 144.0.7559.96

## Results

| Validation area | Result |
|---|---:|
| Static repository tests | 16 of 16 PASS |
| Chromium interaction checks | 49 of 49 PASS |
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

## Environment limitation

The local static server returned the expected HTTP responses, including the 404 page. Chromium navigation to local addresses was blocked by an administrator policy in this execution environment, so the exact HTML, CSS, JavaScript, and artwork were exercised through an in-memory browser document. The browser test uses normal localhost navigation when the environment permits it.

Browser-origin persistence, GitHub-hosted Actions, any future hosted deployment/readback, Safari, and a formal assistive-technology audit remain external checks.

`npm run test:browser` emits the detailed browser-result JSON and temporary screenshots at runtime; `VALIDATION_RESULTS.json` records the controlling local summary.
