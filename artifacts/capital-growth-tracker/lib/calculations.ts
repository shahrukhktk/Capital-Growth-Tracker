export type TrackingStatus =
  | 'achieved'
  | 'partial'
  | 'loss'
  | 'pending'
  | 'upcoming'
  | 'skipped';

export type TrackerSettings = {
  startDate: string;
  initialCapital: number;
  dailyTargetPct: number;
  tradingDays: number[];
  projectionEndDate: string;
};

export type ActualRecord = {
  id: string;
  date: string;
  actualProfit: number;
  closingBalance?: number;
};

export type DailyEntry = {
  date: string;
  isActive: boolean;
  targetBalance: number;
  targetProfit: number;
  actualBalance?: number;
  actualProfit?: number;
  status: TrackingStatus;
  performanceRatio?: number;
};

export type MonthlySummary = {
  key: string;
  label: string;
  startDate: string;
  endDate: string;
  startingBalance: number;
  targetClosingBalance: number;
  targetProfit: number;
  trackingDays: number;
  completedDays: number;
  remainingDays: number;
  targetsAchieved: number;
  targetsMissed: number;
  actualProfit: number;
  achievementRate: number;
  progress: number;
  currentCapital?: number;
  projectedMonthEndBalance: number;
  isUpcoming: boolean;
};

export type TrackerSnapshot = {
  settings: TrackerSettings;
  records: ActualRecord[];
  dailyEntries: DailyEntry[];
  currentCapital: number;
  totalProfit: number;
  growthPct: number;
  achievedCount: number;
  currentStreak: number;
  latestActualDate: string;
  nextTargetDate: string;
  nextTargetProfit: number;
  nextTargetBalance: number;
  remainingTradingDays: number;
  projectedDecemberTarget: number;
  requiredTargetDays: number;
  monthly: MonthlySummary[];
};

export const DEFAULT_SETTINGS: TrackerSettings = {
  startDate: '2026-09-19',
  initialCapital: 5000,
  dailyTargetPct: 5,
  tradingDays: [0, 1, 2, 3, 4, 5, 6],
  projectionEndDate: '2026-12-31',
};

export const DEFAULT_RECORDS: ActualRecord[] = [
  { id: 'seed-19-sep', date: '2026-09-19', actualProfit: 250, closingBalance: 5250 },
  { id: 'seed-20-sep', date: '2026-09-20', actualProfit: 262.5, closingBalance: 5512.5 },
];

export function parseDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function dateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

export function addDays(value: string, amount: number) {
  const next = parseDate(value);
  next.setDate(next.getDate() + amount);
  return dateKey(next);
}

export function dayOfWeek(value: string) {
  return parseDate(value).getDay();
}

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatMoney(value: number, withSign = false) {
  const prefix = withSign && value >= 0 ? '+' : '';
  return `${prefix}SAR ${Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatShortDate(value: string) {
  return parseDate(value).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
  });
}

export function formatLongDate(value: string) {
  return parseDate(value).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function monthKey(value: string) {
  return value.slice(0, 7);
}

export function monthLabel(value: string) {
  return parseDate(`${value}-01`).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

function isActiveDate(value: string, settings: TrackerSettings) {
  return settings.tradingDays.includes(dayOfWeek(value));
}

function stepBalance(balance: number, pct: number) {
  const profit = roundMoney(balance * (pct / 100));
  return { profit, closing: roundMoney(balance + profit) };
}

function normalizeRecords(settings: TrackerSettings, records: ActualRecord[]) {
  let running = settings.initialCapital;
  return [...records]
    .filter((record) => record.date >= settings.startDate && record.date <= settings.projectionEndDate)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((record) => {
      const actualProfit = roundMoney(Number(record.actualProfit) || 0);
      running = roundMoney(running + actualProfit);
      return { ...record, actualProfit, closingBalance: running };
    });
}

function getTrackingDates(settings: TrackerSettings) {
  const dates: string[] = [];
  let current = settings.startDate;
  while (current <= settings.projectionEndDate) {
    dates.push(current);
    current = addDays(current, 1);
  }
  return dates;
}

export function calculateTracker(
  rawSettings: TrackerSettings = DEFAULT_SETTINGS,
  rawRecords: ActualRecord[] = DEFAULT_RECORDS,
): TrackerSnapshot {
  const settings = { ...DEFAULT_SETTINGS, ...rawSettings };
  const records = normalizeRecords(settings, rawRecords);
  const recordByDate = new Map(records.map((record) => [record.date, record]));
  let targetBalance = settings.initialCapital;
  const dailyEntries: DailyEntry[] = [];

  for (const date of getTrackingDates(settings)) {
    const isActive = isActiveDate(date, settings);
    const step = isActive ? stepBalance(targetBalance, settings.dailyTargetPct) : { profit: 0, closing: targetBalance };
    if (isActive) targetBalance = step.closing;
    const actual = recordByDate.get(date);
    const status: TrackingStatus = actual
      ? actual.actualProfit >= step.profit - 0.01
        ? 'achieved'
        : actual.actualProfit > 0
          ? 'partial'
          : 'loss'
      : date <= (records.at(-1)?.date ?? '') && isActive
        ? 'skipped'
        : 'upcoming';
    dailyEntries.push({
      date,
      isActive,
      targetBalance,
      targetProfit: step.profit,
      actualBalance: actual?.closingBalance,
      actualProfit: actual?.actualProfit,
      status,
      performanceRatio: actual ? (actual.closingBalance! / targetBalance) * 100 : undefined,
    });
  }

  const latest = records.at(-1);
  const currentCapital = latest?.closingBalance ?? settings.initialCapital;
  const totalProfit = roundMoney(currentCapital - settings.initialCapital);
  const growthPct = settings.initialCapital ? (totalProfit / settings.initialCapital) * 100 : 0;
  const achievedCount = records.filter((record) => {
    const target = dailyEntries.find((entry) => entry.date === record.date);
    return target && record.actualProfit >= target.targetProfit - 0.01;
  }).length;

  let currentStreak = 0;
  for (let index = records.length - 1; index >= 0; index -= 1) {
    const record = records[index];
    const target = dailyEntries.find((entry) => entry.date === record.date);
    if (target && record.actualProfit >= target.targetProfit - 0.01) currentStreak += 1;
    else break;
  }

  let nextTargetDate = addDays(latest?.date ?? settings.startDate, 1);
  while (nextTargetDate <= settings.projectionEndDate && !isActiveDate(nextTargetDate, settings)) {
    nextTargetDate = addDays(nextTargetDate, 1);
  }
  const nextStep = stepBalance(currentCapital, settings.dailyTargetPct);
  const futureEntries = dailyEntries.filter(
    (entry) => entry.date > (latest?.date ?? settings.startDate) && entry.isActive,
  );
  const projectedDecemberTarget =
    futureEntries.length > 0
      ? futureEntries.reduce(
          (balance) => stepBalance(balance, settings.dailyTargetPct).closing,
          currentCapital,
        )
      : currentCapital;
  const remainingTradingDays = futureEntries.length;
  const requiredTargetDays =
    settings.dailyTargetPct > 0 && projectedDecemberTarget > currentCapital
      ? Math.ceil(
          Math.log(projectedDecemberTarget / currentCapital) /
            Math.log(1 + settings.dailyTargetPct / 100),
        )
      : 0;

  const monthly: MonthlySummary[] = [];
  let monthCursor = `${settings.startDate.slice(0, 7)}-01`;
  while (monthCursor.slice(0, 7) <= settings.projectionEndDate.slice(0, 7)) {
    const key = monthCursor.slice(0, 7);
    const monthDates = dailyEntries.filter((entry) => entry.date.startsWith(key));
    const firstEntry = monthDates[0];
    const priorEntry = dailyEntries.findLast((entry) => entry.date < (firstEntry?.date ?? monthCursor));
    const monthRecords = records.filter((record) => record.date.startsWith(key));
    const startingBalance = priorEntry?.targetBalance ?? settings.initialCapital;
    const lastEntry = monthDates.at(-1);
    const targetClosingBalance = lastEntry?.targetBalance ?? startingBalance;
    const completedDays = monthRecords.length;
    const targetsAchieved = monthRecords.filter((record) => {
      const target = monthDates.find((entry) => entry.date === record.date);
      return target && record.actualProfit >= target.targetProfit - 0.01;
    }).length;
    const lastMonthActual = monthRecords.at(-1);
    const remainingDays = Math.max(0, monthDates.filter((entry) => entry.isActive).length - completedDays);
    let projectedMonthEndBalance = targetClosingBalance;
    if (lastMonthActual?.closingBalance !== undefined) {
      const afterActual = monthDates.filter(
        (entry) => entry.isActive && entry.date > lastMonthActual.date,
      ).length;
      projectedMonthEndBalance = lastMonthActual.closingBalance;
      for (let index = 0; index < afterActual; index += 1) {
        projectedMonthEndBalance = stepBalance(projectedMonthEndBalance, settings.dailyTargetPct).closing;
      }
    }
    monthly.push({
      key,
      label: monthLabel(key),
      startDate: monthDates[0]?.date ?? monthCursor,
      endDate: monthDates.at(-1)?.date ?? monthCursor,
      startingBalance,
      targetClosingBalance,
      targetProfit: roundMoney(targetClosingBalance - startingBalance),
      trackingDays: monthDates.filter((entry) => entry.isActive).length,
      completedDays,
      remainingDays,
      targetsAchieved,
      targetsMissed: Math.max(0, completedDays - targetsAchieved),
      actualProfit: roundMoney(monthRecords.reduce((sum, record) => sum + record.actualProfit, 0)),
      achievementRate: completedDays ? (targetsAchieved / completedDays) * 100 : 0,
      progress: monthDates.filter((entry) => entry.isActive).length
        ? (completedDays / monthDates.filter((entry) => entry.isActive).length) * 100
        : 0,
      currentCapital: lastMonthActual?.closingBalance,
      projectedMonthEndBalance,
      isUpcoming: completedDays === 0 && (monthDates[0]?.date ?? monthCursor) > (latest?.date ?? ''),
    });
    const nextMonth = parseDate(`${key}-01`);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    monthCursor = dateKey(nextMonth);
  }

  return {
    settings,
    records,
    dailyEntries,
    currentCapital,
    totalProfit,
    growthPct,
    achievedCount,
    currentStreak,
    latestActualDate: latest?.date ?? settings.startDate,
    nextTargetDate,
    nextTargetProfit: nextStep.profit,
    nextTargetBalance: nextStep.closing,
    remainingTradingDays,
    projectedDecemberTarget,
    requiredTargetDays,
    monthly,
  };
}