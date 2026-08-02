const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  timeout: 20000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 16,
  quiet: true,
  retries: 1,
  reporter: "list",
  globalSetup: require.resolve("./tests/global-setup.js"),
  globalTeardown: require.resolve("./tests/global-teardown.js"),
  use: {
    baseURL: "http://localhost:8080",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: 'python -m http.server 8080',
    url: "http://localhost:8080",
    reuseExistingServer: !process.env.CI,
  },
});
