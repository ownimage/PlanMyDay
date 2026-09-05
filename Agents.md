Ask questions if anything is not clear
Ask questions if there are implementation options
When running playwright use the command '.\node_modules\.bin\playwright.cmd' to make sure the correct version loads. 
Please capture all the output needed when running a test the first time so that you do not need to rerun the test.
When running the regression tests run them in 30 batches, and use regression.spec.js and touch.spec.js
After fixing issues with the regression tests apply them to screenshots.spec.js and validate them using one theme only.

## Self-improving playbook
At the START of every session, read this file fully and apply all rules.

At the END of every session (or once a task is complete), BEFORE finishing, do the following:
1. Add a dated entry under "Session log" below with:
   - What was done
   - What worked
   - What did not work
   - Anything learned that improves future work
2. Update any stale rule above that no longer matches reality.
3. Keep this file concise. Remove or condense entries that are no longer useful.

Keep this file up to date with things that will improve the project.
If there are ways to run code for test purposes that do or do not work, note them in here so you learn from them.

## Session log

### 2026-09-05
- Added "Self-improving playbook" section (read at start, dated session log at end).
- Replaced the Ad Hoc removal confirm (was `deleteConfirmModal` bootstrap modal) with the `smd-modal` custom element.
  - Added `js/components/smd-modal.js` script include to `index.html`.
  - Added reusable `showSmdModal(options)` helper in `js/app.js` that creates/reuses a single `#smdConfirmModal` host and resolves via the `smd-modal-action` event.
  - Updated `tests/regression.spec.js` Ad Hoc tests to target `#smdConfirmModal` instead of `#deleteConfirmModal`.
- Converted ALL remaining `deleteConfirmModal` flows to `smd-modal`: delete stream, delete job task, delete job (view→edit + accordion), delete image, clear all data.
  - Each confirm now uses Cancel + a danger button ("Delete" or "Clear"). Content strings are escaped (smd-modal renders raw HTML).
  - Removed the now-dead `#deleteConfirmModal` markup from `index.html` and its 5 font-size rule groups from `css/styles.css`.
  - Updated all affected `tests/regression.spec.js` tests to `#smdConfirmModal` + `locator("button").filter({ hasText: "..." })`.
- Converted the remaining two bootstrap modals to `smd-modal`: `infoConfirmModal` (now `showInfoConfirm`) and `scheduleModal` (the job schedule editor).
  - `showInfoConfirm` now escapes its message, converts `\n`→`<br>`, and shows via `showSmdModal` with a single OK button.
  - The schedule form moved out of `index.html` into `getScheduleFormHTML()` (app.js). Since smd-modal content lives in a shadow root:
    - Added `scheduleEl(id)` / `scheduleRadios()` helpers that reach into `#smdConfirmModal`'s shadow root (bootstrap `document.getElementById`/`querySelectorAll` can't see shadow content).
    - `onScheduleTypeChange`, `onScheduleNDaysChange`, `saveScheduleModal` updated to use those helpers (`jobField` is shadow-agnostic since it only touches jobsBuffer).
    - Injected `SCHEDULE_MODAL_STYLES` into the modal shadow root via `injectStyleInto` (form-check/select/utility classes incl. `.d-none`).
    - Removed `closeScheduleModal`, `scheduleModalCallback`, the `scheduleModal` markup, and all `#scheduleModal .btn-primary`/`#infoConfirmModal` test locators (now `#smdConfirmModal` + `smd-footer button[data-index='1']`).
- What worked: Playwright CSS/role locators pierce the open shadow DOM, so schedule form ids (`#schedDaily`, `#schedDay0`, …) keep working unchanged. Use single quotes in CSS attribute selectors inside double-quoted JS test strings (`[data-index='1']`), since double quotes break the string. `smd-page` is z-index 1040 and the `smd-modal` host 1050, so the modal lays above every editor — no z-index boost hacks needed.
- Refinements: info modal title is now "Sample images loaded" (first line removed from body); the schedule day checkboxes hide until "Specific days" is picked (`.d-none` needed `!important` to beat the `d-flex` class on `#schedDaysOptions`); `smd-modal` `h3` and `smd-page` `h2` both use `color: color-mix(in srgb, var(--bs-body-color) 60%, white)` and the `.smd-header` now gets the same lightened background band as `.smd-page-header` (`color-mix(in srgb, var(--bs-body-bg) 85%, white)`) with `overflow: hidden` on the dialog so the band clips to the rounded corners — the modal header band/title now visibly matches the page header.
- Converted the last three dialogs:
  - `streamEditModal` (bootstrap) → `<smd-page id="streamEditPage">`: new page with `openStreamEditPage`/`hideStreamEditPage` (mirrors jobEditPage), footer Cancel/OK smd-buttons, `streamEditSubmit()` for Enter-to-save, `updateStreamEditOkBtn`/`updateStreamImagePreview` switched to `$id` (form lives in the page shadow root). `openImagePicker` no longer needs to hide the underlying editor (picker z-index 1060 sits above pages at 1040).
  - `minioAlertModal` → `showSmdModal` ("Minio"/"Minio Error" title, OK button, danger variant for errors).
  - `minioImportModal` → `showSmdModal` with a `#minioImportBody` inside the modal shadow root; `loadMinioBuckets`/`loadMinioBucketFiles`/`importMinioFile` now use `$id`, `closeMinioImport` just removes `open` from the shared host, and `MINIO_IMPORT_STYLES` styles list-group/buttons/spinner inside `.smd-body`.
  - `injectStyleInto` now ACCUMULATES unique CSS blocks into a single `.smd-shared-style` element instead of injecting once — required because the shared `#smdConfirmModal` host receives both schedule and minio styles (previously the second injection was skipped).
- Lessons: smd-button disabled state must be asserted via `#id button` (the native button inside its shadow), not the host. Reused ids (`#smdConfirmModal`) mean multiple injections into the same shadow root must concatenate. Tests with unique assertive renaming (`#streamEditModalBody` → `#streamEditPage .smd-page-body`) need ordered replaceAll (body first, then the modal id).
- `minioImportModal` → `<smd-page id="minioImportPage">` (full-screen import-from-minio flow): `openMinioImportPage`/`closeMinioImport` (mirror jobEditPage hide-with-timer), `smd-page-action` Close button, `MINIO_IMPORT_STYLES` re-scoped from `.smd-body` to `.smd-page-body`, `#minioImportBody` lives in the page shadow root. Error paths (bucket/file list failure) close the page and show a `showMinioAlert` error modal — the old test expectation "page should still exist" became "error alert shows + page hidden".
- Added regression test "minio menu options hidden when disabled via the settings minio tab": settings → Minio tab → toggling `#minioEnabled` updates the main-menu Import/Export items via `updateMinioMenu` (called from `changeMinioEnabled`).
- Minio import page: bucket name moved into the header as a `badge bg-info`; the "Back" button was removed (footer Close does the same); file list is flush-left with no bullets.
- Lesson: setting ANY smd-page property (`title`/`content`/`headerHtml`/`buttons`) re-renders the shadow root via `_render()`, which DESTROYS previously injected `<style class="smd-shared-style">` elements. Re-inject styles AFTER the last property set, and re-inject again after any later property change (e.g. `loadMinioBucketFiles` sets `page.headerHtml` → must call `injectStyleInto` again).
- smd-tabs had a white-on-white bug on the Quartz theme: inactive tabs used `--bs-tertiary-bg` (#f8f9fa = white) with `--bs-secondary-color` text (rgba white) — invisible. Restyled to follow bootswatch nav-tabs: inactive = transparent bg + `--bs-body-color` text; active = `--bs-tertiary-bg` + `--bs-emphasis-color` (white tab / dark text on Quartz); underline uses `--bs-border-color` instead of primary. Verified by computed-style probe on quartz + yeti.
- smd-tabs tab colours: selected tab uses `--smd-primary` + `--smd-primary-text` (matches primary smd-button), non-selected uses `--smd-secondary` + `--smd-primary-text` (matches secondary smd-button).
- Quartz `.dropdown-menu` had a glassmorphism treatment (translucent white gradient + `backdrop-filter: blur(5px)`, transparent bg) that washed out white menu text — added a `.dropdown-menu` override (opaque `--bs-dropdown-bg`, `background-image: none`, no blur) mirroring the existing `.modal-content` rule. Added screenshot test `main menu dropdown` → `main-menu-dropdown.png` (all themes).
- Stream accordion headers (`pmd-stream-header` in the streams editor): collapsed headers use secondary (`--smd-secondary` + `--smd-primary-text`), expanded headers use info (`--bs-info` + `--bs-info-text`). Drag-handle now `color: currentColor` so it follows the header colour. NB: contents of `#streamsEditor`/`#streamEditorList` live in the smd-page shadow root — page.evaluate must query `document.getElementById("streamsEditor").shadowRoot`, not light-DOM querySelector (Playwright locators pierce automatically).
- Lesson: `showSmdModal` is a single shared `#smdConfirmModal` host — every call re-renders its shadow content, so set `.content`/`.buttons`/`.title` before `show()`. Inline global `onchange="..."` handlers inside the shadow content still fire, but the handler bodies must resolve elements via the shadow root.
- What did not work: `rg` is not available on this machine (use Grep tool instead). Ripgrep via the Grep tool also chokes on very large matched lines (minified vendor files) — limit searches to `js/**` or exclude vendor files.
