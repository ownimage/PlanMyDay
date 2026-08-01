### Run only the regression tests
```bash
npx playwright test tests/regression.spec.js
```
### Screenshots
```bash
npx playwright test tests/screenshots.spec.js --workers 16
```
### Screenshot viewer
```bash
npx nodemon screenshots/viewer.js
```