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

Reflection text is stored in local browser storage under `theta7.reflection.v1.2`. Download uses an in-browser Blob and never uploads content.

## Deployment

No automatic site publication is configured. The complete deployable surface remains in `site/` so a future hosting decision can publish only that directory. Downloaded copies run offline; hosted copies require a network connection for initial delivery.
