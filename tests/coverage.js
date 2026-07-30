const { CoverageReport } = require("monocart-coverage-reports");

const coverageReport = new CoverageReport({
  outputDir: "coverage-report",
  reports: ["v8", "html"],
  name: "PlanMyDay Coverage",
});

async function startCoverage(page) {
  try {
    await page.coverage.startJSCoverage({ resetOnNavigation: false });
  } catch (e) {
    // JSCoverage may already be enabled from outer beforeEach; ignore
  }
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
  try {
    await coverageReport.generate();
  } catch (e) {
    console.warn("Coverage report generation skipped:", e.message);
  }
}

module.exports = { startCoverage, stopCoverage, generateCoverage };
