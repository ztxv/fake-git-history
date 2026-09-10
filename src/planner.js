const crypto = require("node:crypto");
const DAY = 86400000;
const dateKey = date => date.toISOString().slice(0, 10);
function parseDate(value) {
  if (typeof value !== "string" || !/^\d{4}[-/]\d{2}[-/]\d{2}$/.test(value))
    throw new Error("Use dates in YYYY-MM-DD format.");
  const key = value.replaceAll("/", "-");
  const date = new Date(`${key}T00:00:00Z`);
  if (!Number.isFinite(+date) || dateKey(date) !== key)
    throw new Error("Enter a valid calendar date.");
  return date;
}
function createPlan(input = {}) {
  const today = new Date();
  const start = parseDate(
    input.startDate ??
      dateKey(
        new Date(
          Date.UTC(
            today.getUTCFullYear() - 1,
            today.getUTCMonth(),
            today.getUTCDate()
          )
        )
      )
  );
  const end = parseDate(input.endDate ?? dateKey(today));
  const count = Math.round((end - start) / DAY) + 1;
  if (count < 1 || count > 366 * 5)
    throw new Error("Choose a date range between 1 day and 5 years.");
  const range = Array.isArray(input.commitsPerDay)
    ? input.commitsPerDay
    : String(input.commitsPerDay || "0,4")
        .split(",")
        .map(Number);
  if (
    range.length !== 2 ||
    !range.every(n => Number.isInteger(n) && n >= 0 && n <= 100) ||
    range[0] > range[1]
  )
    throw new Error("Commits per day must be an ordered range from 0 to 100.");
  const frequency = input.frequency ?? 80;
  if (!Number.isFinite(frequency) || frequency < 0 || frequency > 100)
    throw new Error("Frequency must be between 0 and 100.");
  const distribution = input.distribution || "uniform";
  if (!["uniform", "workHours", "afterWork"].includes(distribution))
    throw new Error("Choose a valid activity pattern.");
  const seed = String(input.seed ?? crypto.randomBytes(4).toString("hex"));
  if (seed.length > 100)
    throw new Error("Seed must be at most 100 characters.");
  let state = crypto
    .createHash("sha256")
    .update(seed)
    .digest()
    .readUInt32LE(0);
  const random = () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const [min, max] = range;
  const days = [],
    dates = [];
  const multipliers =
    distribution === "workHours"
      ? [0.1, 0.8, 1.2, 1.3, 1.2, 0.7, 0.1]
      : [1.3, 0.6, 0.5, 0.5, 0.7, 0.9, 1.4];
  const weights =
    distribution === "workHours"
      ? [
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          1,
          3,
          8,
          12,
          15,
          15,
          14,
          12,
          10,
          8,
          5,
          2,
          1,
          0,
          0,
          0,
          0
        ]
      : distribution === "afterWork"
      ? [
          3,
          2,
          1,
          0,
          0,
          0,
          1,
          2,
          2,
          2,
          1,
          1,
          1,
          1,
          1,
          2,
          3,
          5,
          10,
          15,
          18,
          15,
          10,
          5
        ]
      : [
          1,
          1,
          0,
          0,
          0,
          0,
          1,
          2,
          5,
          8,
          10,
          12,
          10,
          15,
          18,
          16,
          12,
          8,
          5,
          3,
          2,
          2,
          1,
          1
        ];
  for (let i = 0; i < count; i++) {
    const date = new Date(+start + i * DAY);
    let commits = 0;
    if (random() * 100 < frequency) {
      commits =
        distribution === "uniform"
          ? min + Math.floor(random() * (max - min + 1))
          : Math.max(
              min,
              Math.min(
                max,
                Math.round(
                  ((min + max) / 2) * multipliers[date.getUTCDay()] +
                    (Math.sqrt(-2 * Math.log(1 - random())) *
                      Math.cos(2 * Math.PI * random()) *
                      (max - min)) /
                      4
                )
              )
            );
    }
    days.push({ date: dateKey(date), count: commits });
    for (let j = 0; j < commits; j++) {
      let weight = random() * weights.reduce((a, b) => a + b, 0),
        hour = 0;
      while (hour < 23 && (weight -= weights[hour]) >= 0) hour++;
      dates.push(
        new Date(
          +date + hour * 3600000 + Math.floor(random() * 3600) * 1000
        ).toISOString()
      );
    }
  }
  if (dates.length > 25000)
    throw new Error(
      "This plan exceeds 25,000 commits. Reduce the date range or daily count."
    );
  dates.sort();
  return {
    seed,
    startDate: dateKey(start),
    endDate: dateKey(end),
    distribution,
    frequency,
    commitsPerDay: range,
    days,
    dates,
    total: dates.length,
    activeDays: days.filter(d => d.count > 0).length,
    peak: Math.max(...days.map(d => d.count))
  };
}
module.exports = { createPlan, parseDate };
