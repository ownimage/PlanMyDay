### Run only the regression tests
```bash
.\node_modules\.bin\playwright.cmd test tests/regression.spec.js  tests/touch.spec.js --retries=0
```
```bash
.\node_modules\.bin\playwright.cmd test --last-failed
```
npx playwright test -g "your test name" --repeat-each=10
npx playwright test tests/regression.spec.js --repeat-each=100

```bash
python tests/http-server.py
```
### SampleImages
```bash
npx playwright test tests/sampleImages.spec.js --workers 1
```
### Screenshots
```bash
.\node_modules\.bin\playwright.cmd test tests/screenshots.spec.js --workers 16
```
### Screenshot viewer
```bash
node screenshots/viewer.js
```

### Component storybook
The storybook is a static page (`storybook/index.html`) that renders every `smd-` and `pmd-` web component and lets you pick the bootswatch theme from a dropdown in the header.

Serve the project root, then open it in a browser. The existing dev server is reused, so just run:

```bash
python tests/http-server.py
```

Then visit: <http://localhost:8080/storybook/index.html>

The chosen theme is remembered in `localStorage` (`storybook_theme`). Each section shows live demo instances; interactive bits (modal/page open, tab switching, stream-header expand, active toggles, card buttons) emit their normal composed events into the section's event log.
