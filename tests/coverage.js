const { CoverageReport } = require("monocart-coverage-reports");

const coverageReport = new CoverageReport({
  outputDir: "coverage-report",
  reports: ["v8", "html"],
  name: "PlanMyDay Coverage",
});

let clean = false;

async function startCoverage(page) {
  if (!clean) {
    await coverageReport.cleanCache();
    clean = true;
  }
  await page.coverage.startJSCoverage({ resetOnNavigation: false });
}

async function stopCoverage(page) {
  let data = await page.coverage.stopJSCoverage();
  data = data.filter((entry) => {
    try {
      const url = new URL(entry.url);
      return url.pathname.startsWith("/js/") && url.origin === "http://localhost:8080";
    } catch {
      return false;
    }
  });
  if (data.length > 0) {
    await coverageReport.add(data);
  }
}

async function generateCoverage() {
  await coverageReport.generate();
}

module.exports = { startCoverage, stopCoverage, generateCoverage };