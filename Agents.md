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
- What worked: `smd-page` is z-index 1040 and `smd-modal` host is 1050, so the modal lays above every editor — the old bootstrap z-index boost hacks were unnecessary and got dropped.
- What did not work: `rg` is not available on this machine (use Grep tool instead). Ripgrep via the Grep tool also chokes on very large matched lines (minified vendor files) — limit searches to `js/**` or exclude vendor files.
- Lesson: `deleteConfirmModal` was a shared bootstrap confirm; after converting every flow, the markup/CSS became dead code. Old tests that forced `bootstrap.Modal.getInstance(...).hide()` cleanup are obsolete — smd-modal hides itself synchronously on any button click.
