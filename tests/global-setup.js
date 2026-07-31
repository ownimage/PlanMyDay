const { cleanCoverageCache } = require("./coverage");

module.exports = async function globalSetup() {
  await cleanCoverageCache();
};
