export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export type OpeningHours = Partial<Record<Weekday, [string, string][]>>;
export const WEEKDAYS: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const BY_UTC_DAY: Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const DAY_LABEL: Record<Weekday, string> = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };
const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };

/** Lagos is UTC+1 year-round (no DST). */
function lagos(now: Date) {
  const s = new Date(now.getTime() + 60 * 60 * 1000);
  return { dayIndex: s.getUTCDay(), minutes: s.getUTCHours() * 60 + s.getUTCMinutes() };
}
export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}
export function openStatus(hours: OpeningHours | null, now: Date = new Date()): { open: boolean; label: string } {
  if (!hours || !WEEKDAYS.some((d) => hours[d]?.length)) return { open: false, label: "Hours not set" };
  const { dayIndex, minutes } = lagos(now);
  const today = hours[BY_UTC_DAY[dayIndex]] ?? [];
  for (const [o, c] of today) if (minutes >= toMin(o) && minutes < toMin(c)) return { open: true, label: `Open · closes ${formatTime(c)}` };
  const laterToday = today.filter(([o]) => toMin(o) > minutes).sort((a, b) => toMin(a[0]) - toMin(b[0]))[0];
  if (laterToday) return { open: false, label: `Closed · opens ${formatTime(laterToday[0])}` };
  for (let i = 1; i <= 7; i++) {
    const day = BY_UTC_DAY[(dayIndex + i) % 7];
    const first = [...(hours[day] ?? [])].sort((a, b) => toMin(a[0]) - toMin(b[0]))[0];
    if (first) return { open: false, label: `Closed · opens ${DAY_LABEL[day]} ${formatTime(first[0])}` };
  }
  return { open: false, label: "Hours not set" };
}
