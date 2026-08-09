### Run only the regression tests
```bash
npx playwright test tests/regression.spec.js  tests/touch.spec.js 
```
```bash
npx playwright test --last-failed
```
npx playwright test -g "your test name" --repeat-each=10
npx playwright test tests/regression.spec.js --repeat-each=100

### Node server
```bash
npx http-server
```
### Screenshots
```bash
npx playwright test tests/screenshots.spec.js --workers 16
```
### Screenshot viewer
```bash
node screenshots/viewer.js
```