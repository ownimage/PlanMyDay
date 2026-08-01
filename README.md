# PlanMyDay

A static PWA for daily task planning.

## Development

Serve the app locally:

```
python -m http.server 8080
```

Then open http://localhost:8080.

## Tests

Powered by [Playwright](https://playwright.dev).

### Install

```bash
npm install
npx playwright install chromium
```

### Run all tests

```bash
npm test
```

### Run only the regression tests

```bash
npx playwright test tests/regression.spec.js
```

### Run a single test

```bash
npx playwright test tests/regression.spec.js --grep "test name"
```

### Useful flags

| Flag | Purpose |
|------|---------|
| `--headed` | See the browser window |
| `--ui` | Playwright UI inspector |
| `--debug` | Step-by-step with pause |
| `--workers 1` | Run serially (one browser at a time) |

### Test report

After a run, open the HTML report:

```bash
npx playwright show-report
```

### Coverage

JS coverage is collected automatically during tests (via `monocart-coverage-reports`). After running the tests, open the report:

```
coverage-report/index.html
```

### Screenshots

Regenerate all screenshots in the `screenshots/` folder:

```bash
npx playwright test tests/screenshots.spec.js --workers 1
```

This captures 27 views across all themes:
- `add-stream.png`
- `edit-images.png`
- `edit-job.png`
- `edit-streams.png`
- `job-edit-general.png`, `job-edit-schedule.png`, `job-edit-tasks.png`
- `main-screen-add-job.png`
- `main-view.png`, `main-view-split-progress.png`, `main-view-split-maintenance.png`, `main-view-hide-done.png`
- `schedule-every-day.png`, `schedule-every-n-days.png`, `schedule-weekdays.png`, `schedule-weekends.png`, `schedule-specific-days.png`, `schedule-day-of-month.png`
- `settings.png`, `settings-appearance.png`, `settings-schedule.png`, `settings-danger.png`
- `stream-add-job.png`
- `stream-job-list.png`
- `view-job-general.png`, `view-job-schedule.png`, `view-job-tasks.png`

### Screenshot viewer

Browse all theme screenshots side by side in a browser:

```bash
node screenshots/viewer.js
```

Opens a local viewer at `http://localhost:3000` with accordion sections per theme, a unified horizontal scrollbar to compare screenshots across themes, and Open All / Collapse All buttons.
