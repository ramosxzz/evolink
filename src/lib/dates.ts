// Dates in the user's local timezone. toISOString() is UTC, which in Brazil
// (UTC-3) rolls "today" over to tomorrow from 21:00 on.

export function localDate(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function addDays(days: number, from = new Date()) {
  const date = new Date(from);
  date.setDate(date.getDate() + days);
  return date;
}

/** Local midnight as an ISO timestamp, for timestamptz filters. */
export function startOfTodayIso() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

/** Monday of the current week (YYYY-MM-DD), matching check_ins.week_of. */
export function weekStart(date = new Date()) {
  return localDate(addDays(-((date.getDay() + 6) % 7), date));
}
