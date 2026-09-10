const path = require("node:path");
const ora = require("ora");
const { createPlan, parseDate } = require("./planner");
const { git, generateRepository } = require("./repository");
const visualize = require("./visualization");
module.exports = async function(options) {
  let spinner;
  try {
    const plan = createPlan(options);
    const dates = plan.dates.map(date => new Date(date));
    if (options.preview) {
      console.log(
        visualize(
          dates,
          parseDate(plan.startDate),
          parseDate(plan.endDate),
          plan.distribution
        )
      );
      return;
    }
    const name = (await git(["config", "--get", "user.name"])).stdout.trim();
    const email = (await git(["config", "--get", "user.email"])).stdout.trim();
    spinner = ora("Generating Git history").start();
    const destination = await generateRepository({
      plan,
      root: process.cwd(),
      folder: "my-history",
      name,
      email,
      onProgress: n =>
        (spinner.text = `Generating Git history (${n}/${plan.total})`)
    });
    spinner.succeed(
      `Created ${plan.total} commits in ${path.resolve(destination)}`
    );
    console.log(
      visualize(
        dates,
        parseDate(plan.startDate),
        parseDate(plan.endDate),
        plan.distribution
      )
    );
  } catch (error) {
    if (spinner) spinner.fail(error.message);
    else console.error(error.message);
    process.exitCode = 1;
  }
};
