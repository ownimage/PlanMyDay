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

This captures 13 views with the Superhero theme:
- `main-view.png`, `main-view-split-progress.png`, `main-view-split-maintenance.png`, `main-view-hide-done.png`
- `main-screen-add-job.png`
- `settings.png`, `settings-danger.png`
- `edit-streams.png`, `add-stream.png`
- `stream-job-list.png`, `stream-add-job.png`, `edit-job.png`
- `edit-images.png`

### Screenshot viewer

Browse all theme screenshots side by side in a browser:

```bash
node screenshots/viewer.js
```

Opens a local viewer at `http://localhost:3000` with accordion sections per theme, a unified horizontal scrollbar to compare screenshots across themes, and Open All / Collapse All buttons.
