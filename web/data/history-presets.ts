export interface HistoryPreset {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  durationDays: number;
  frequency: number;
  commitsPerDay: [number, number];
  distribution: "uniform" | "workHours" | "afterWork";
  bars: number[];
}

const historyPresets: HistoryPreset[] = [
  {
    id: "steady-hand",
    eyebrow: "BALANCED",
    title: "The steady hand",
    description: "A calm, credible rhythm with a few commits on most days.",
    durationDays: 365,
    frequency: 72,
    commitsPerDay: [1, 4],
    distribution: "uniform",
    bars: [3, 5, 4, 6, 5, 3, 4, 6, 5, 4, 6, 3]
  },
  {
    id: "nine-to-five",
    eyebrow: "WORKWEEK",
    title: "Nine to five",
    description: "Concentrated weekday activity with quieter weekends.",
    durationDays: 365,
    frequency: 78,
    commitsPerDay: [1, 6],
    distribution: "workHours",
    bars: [1, 6, 8, 7, 9, 2, 1, 7, 8, 6, 9, 2]
  },
  {
    id: "night-owl",
    eyebrow: "AFTER HOURS",
    title: "Night owl",
    description: "Evening sessions and weekend bursts for the side-project feel.",
    durationDays: 180,
    frequency: 64,
    commitsPerDay: [1, 8],
    distribution: "afterWork",
    bars: [8, 3, 2, 4, 3, 8, 9, 3, 4, 2, 7, 10]
  },
  {
    id: "launch-sprint",
    eyebrow: "HIGH ENERGY",
    title: "Launch sprint",
    description: "A short, dense run of activity that reads like a focused ship cycle.",
    durationDays: 90,
    frequency: 88,
    commitsPerDay: [2, 10],
    distribution: "workHours",
    bars: [5, 8, 10, 9, 7, 3, 2, 7, 10, 9, 8, 4]
  },
  {
    id: "weekend-builder",
    eyebrow: "SIDE PROJECT",
    title: "Weekend builder",
    description: "Sparse weekdays with satisfying bursts when the weekend lands.",
    durationDays: 365,
    frequency: 46,
    commitsPerDay: [1, 7],
    distribution: "afterWork",
    bars: [2, 2, 3, 2, 4, 9, 10, 2, 3, 2, 5, 9]
  },
  {
    id: "slow-burn",
    eyebrow: "LOW KEY",
    title: "The slow burn",
    description: "Light, irregular progress across a long stretch of time.",
    durationDays: 365,
    frequency: 38,
    commitsPerDay: [0, 3],
    distribution: "uniform",
    bars: [2, 4, 1, 3, 2, 5, 1, 3, 2, 4, 1, 2]
  }
];

export async function getHistoryPresets(): Promise<HistoryPreset[]> {
  return historyPresets;
}
