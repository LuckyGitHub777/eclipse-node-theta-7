# Changelog

All notable changes are documented in this file.

## [1.2.2] - 2026-10-31

### Fixed

- Directly opened copies (`file://`) keep reflections in the open tab only, because browsers can share one storage area across all local files. Download keeps a durable copy.
- A reflection saved to shared local-file storage by an earlier version is moved into the tab on first open and removed from shared storage.
- Save now reports when browser storage is unavailable instead of claiming the reflection was saved.
- Reloading or closing the page with an unsaved reflection asks for confirmation. Saving (hosted) or downloading clears the prompt.
- Audio cleanup moved to page hide so a cancelled reload keeps sound working.

## [1.2.1] - 2026-10-30

### Changed

- Corrected repository ownership metadata for `LuckyGitHub777`.
- Adopted a single continuous-integration workflow with no automatic site publication.
- Reduced repository ceremony while preserving the validated experience, integrity checks, browser tests, privacy boundary, and release tooling.
- Replaced the raster preview with a native vector sigil for crisp rendering and a lighter repository.

### Removed

- Automatic GitHub Pages deployment.
- Redundant collaboration templates and release-process documents that did not improve the product or its verification.

## [1.2.0] - 2026-10-30

### Added

- User-paced seven-question mode.
- Concise three-mode control system.
- Contextual breathing and sound controls.
- Local reflection download.
- State-transition coverage for ready, active, paused, complete, mode-change, and reset behavior.
- Mobile validation that places controls before the interactive sigil.

### Changed

- Reduced public copy and consolidated supporting information into one About section.
- Replaced abstract mode names with Observe, 7 Prompts, and Breathe.
- Removed the session timer and unrelated control guidance.
- Rebuilt session state handling so mode changes always return to a clean ready state.
- Limited breathing updates to Breathe mode.
- Clarified hosted and downloaded offline behavior.
- Improved touch targets, mobile navigation, focus behavior, and responsive order.

### Removed

- Public release metadata from the hero.
- Duplicate explanatory sections and internal project-history language.
- Unused supersession documentation.
