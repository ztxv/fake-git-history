const crypto = require("node:crypto");
const { buildPlan, normalizePlan, parseDate } = require("./planner-core.mjs");

function createPlan(input = {}) {
  const options = normalizePlan(input, () => crypto.randomBytes(4).toString("hex"));
  const state = crypto
    .createHash("sha256")
    .update(options.seed)
    .digest()
    .readUInt32LE(0);
  return buildPlan(options, state);
}

module.exports = { createPlan, parseDate };
