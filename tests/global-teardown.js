const { generateCoverage } = require("./coverage");

module.exports = async function globalTeardown() {
  await generateCoverage();
};
