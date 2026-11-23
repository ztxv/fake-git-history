import { createPlan, randomSeed } from "./engine/planner.js";

const get = id => document.getElementById(id);
const sampleEnd = "2025-06-30";
const sampleSeed = "git-larp-demo";
const dayMs = 86400000;
const dateFormat = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" });
const numberFormat = new Intl.NumberFormat("en-US");
const parseDay = date => new Date(date + "T00:00:00Z");
const formatDay = date => dateFormat.format(parseDay(date));
const initialPlan = {
  startDate: "2025-04-02",
  endDate: sampleEnd,
  frequency: 82,
  commitsPerDay: [1, 6],
  distribution: "workHours",
  seed: sampleSeed
};
const examples = [
  { label: "Work hours", distribution: "workHours" },
  { label: "After hours", distribution: "afterWork" },
  { label: "Balanced", distribution: "uniform" }
];
const elements = {
  start: get("start-date"),
  end: get("end-date"),
  pattern: get("pattern"),
  frequency: get("frequency"),
  min: get("min-commits"),
  max: get("max-commits"),
  seed: get("seed")
};
const presets = [...document.querySelectorAll("[data-preset]")];
const calendar = get("calendar");
let plan;
let selected = 0;
let previewRequest = 0;
let exampleIndex = 0;

function level(count, peak) {
  return count === 0 ? 0 : Math.ceil((count / peak) * 4);
}

function placeDays(result, container, makeCell) {
  const offset = parseDay(result.startDate).getUTCDay();
  const cells = result.days.map((day, index) => {
    const cell = makeCell(day, index);
    cell.dataset.level = level(day.count, result.peak);
    cell.style.gridColumn = Math.floor((index + offset) / 7) + 1;
    cell.style.gridRow = ((index + offset) % 7) + 1;
    return cell;
  });
  container.replaceChildren(...cells);
}

async function renderExample() {
  const index = exampleIndex;
  const example = examples[index];
  const heroCalendar = get("hero-calendar");
  try {
    const result = await createPlan({ ...initialPlan, distribution: example.distribution });
    if (index !== exampleIndex) return;
    get("hero-pattern").textContent = example.label;
    get("hero-total").textContent = numberFormat.format(result.total);
    get("hero-status").textContent = example.label + ", " + result.total + " sample commits.";
    placeDays(result, heroCalendar, (day, index) => {
      const cell = document.createElement("span");
      cell.style.animationDelay = Math.floor(index / 7) * 28 + "ms";
      return cell;
    });
  } catch (error) {
    get("hero-status").textContent = error.message;
  }
}

function startForPreset(days) {
  return new Date(+parseDay(sampleEnd) - (days - 1) * dayMs).toISOString().slice(0, 10);
}

function syncPresets() {
  for (const button of presets) {
    const active =
      elements.end.value === sampleEnd &&
      elements.start.value === startForPreset(Number(button.dataset.preset));
    button.setAttribute("aria-pressed", active);
  }
}

function countLabel(count) {
  return numberFormat.format(count) + (count === 1 ? " commit" : " commits");
}

function selectDay(index, focus = false) {
  const previousCell = calendar.children[selected];
  // Rendered calendars always have at least one day.
  previousCell.setAttribute("aria-pressed", "false");
  previousCell.tabIndex = -1;
  selected = index;
  const cell = calendar.children[selected];
  cell.setAttribute("aria-pressed", "true");
  cell.tabIndex = 0;
  if (focus) cell.focus();

  const day = plan.days[index];
  get("selected-date").textContent = formatDay(day.date);
  get("selected-commits").textContent = countLabel(day.count) + (day.count ? " · UTC" : "");
  const times = plan.dates.filter(time => time.startsWith(day.date)).map(time => {
    const item = document.createElement("li");
    item.textContent = time.slice(11, 19);
    return item;
  });
  get("selected-times").replaceChildren(...times);
}

function renderPreview(result) {
  const previousDate = plan?.days[selected]?.date;
  const previousIndex = result.days.findIndex(day => day.date === previousDate);
  const initialIndex = result.days.findIndex(day => day.count > 0);
  const scroll = get("calendar-scroll");
  const previousScroll = scroll.scrollLeft;
  const calendarHadFocus = calendar.contains(document.activeElement);
  plan = result;
  selected = 0;
  get("preview-message").hidden = true;
  get("plan").hidden = false;
  get("total").textContent = numberFormat.format(plan.total);
  get("active-days").textContent = numberFormat.format(plan.activeDays);
  get("peak").textContent = numberFormat.format(plan.peak);
  get("date-caption").textContent = formatDay(plan.startDate) + " – " + formatDay(plan.endDate);
  placeDays(plan, calendar, (day, index) => {
    const cell = document.createElement("button");
    const label = formatDay(day.date) + ", " + countLabel(day.count);
    cell.type = "button";
    cell.dataset.day = index;
    cell.tabIndex = -1;
    cell.setAttribute("aria-label", label);
    cell.setAttribute("aria-pressed", "false");
    cell.title = label;
    return cell;
  });
  scroll.scrollLeft = previousIndex >= 0 ? previousScroll : 0;
  selectDay(previousIndex >= 0 ? previousIndex : Math.max(initialIndex, 0), calendarHadFocus);
  get("plan-status").textContent = countLabel(plan.total) + " across " +
    numberFormat.format(plan.activeDays) + " active days.";
}

async function refreshPreview() {
  const request = ++previewRequest;
  get("frequency-value").value = elements.frequency.value + "%";
  syncPresets();
  try {
    const nextPlan = await createPlan({
      startDate: elements.start.value,
      endDate: elements.end.value,
      distribution: elements.pattern.value,
      frequency: elements.frequency.valueAsNumber,
      commitsPerDay: [elements.min.valueAsNumber, elements.max.valueAsNumber],
      seed: elements.seed.value
    });
    if (request === previewRequest) renderPreview(nextPlan);
  } catch (error) {
    if (request !== previewRequest) return;
    get("plan").hidden = true;
    get("plan-status").textContent = "";
    get("preview-message").textContent = error.message;
    get("preview-message").hidden = false;
  }
}

get("settings").addEventListener("submit", event => event.preventDefault());
get("settings").addEventListener("input", refreshPreview);
get("next-example").addEventListener("click", () => {
  exampleIndex = (exampleIndex + 1) % examples.length;
  renderExample();
});
for (const button of presets) {
  button.addEventListener("click", () => {
    elements.start.value = startForPreset(Number(button.dataset.preset));
    elements.end.value = sampleEnd;
    refreshPreview();
  });
}
get("reshuffle").addEventListener("click", () => {
  elements.seed.value = randomSeed();
  refreshPreview();
});
get("reset-plan").addEventListener("click", () => {
  get("settings").reset();
  plan = undefined;
  refreshPreview();
});
calendar.addEventListener("click", event => {
  if (event.target.matches("button[data-day]")) selectDay(Number(event.target.dataset.day));
});
calendar.addEventListener("keydown", event => {
  const moves = { ArrowUp: -1, ArrowDown: 1, ArrowLeft: -7, ArrowRight: 7 };
  if (!Object.hasOwn(moves, event.key) || !event.target.matches("button[data-day]")) return;
  event.preventDefault();
  const next = Number(event.target.dataset.day) + moves[event.key];
  if (next >= 0 && next < plan.days.length) selectDay(next, true);
});

get("preview-message").textContent = "Preparing the sample calendar…";
renderExample();
refreshPreview();
