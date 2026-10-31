# Architecture

## Goal

Deliver a fast, private, accessible reflection experience with no build step and no runtime dependency.

## Runtime

`site/` contains the complete deployable application:

- `index.html` semantic structure and content
- `assets/css/styles.css` responsive visual system
- `assets/js/app.js` state, interaction, audio, storage, and export behavior
- `assets/img/` local artwork and icon

## Modes

### Observe

An open-ended session with no progress requirement.

### 7 Prompts

Seven user-paced questions. Progress advances only when the user selects **Next question** or **Finish**.

### Breathe

Seven guided cycles using a 4-second inhale, 2-second gentle hold, and 6-second exhale. The user may pause or reset at any time.

## State model

Each mode follows the same states:

`ready → active ⇄ paused → complete`

Changing modes or selecting **Stop & reset** returns the selected mode to `ready`. Preferences and reflection content remain intact.

## Privacy

On a hosted copy, reflection text is stored in local browser storage under `theta7.reflection.v1.2`. A directly opened copy (`file://`) keeps reflection text in memory for the open tab only, because browsers can share one storage area across all local files; any reflection an earlier version saved there is moved into the tab and removed from shared storage. Reloading or closing with an unsaved reflection asks for confirmation. Download uses an in-browser Blob and never uploads content.

## Deployment

GitHub Pages deployment is CI-gated. After **Continuous Integration** succeeds on `main`, `.github/workflows/pages.yml` uploads only `site/` and deploys it with GitHub's official Pages actions. Repository Pages must be enabled once with **Source: GitHub Actions** before the first deployment. Downloaded copies run offline; hosted copies require a network connection for initial delivery.
