import { cn } from "@/lib/cn";
import { formatTime, WEEKDAYS, type OpeningHours, type Weekday } from "@/lib/hours";

const LABEL: Record<Weekday, string> = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" };
const BY_UTC_DAY: Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export function HoursTable({ hours }: { hours: OpeningHours | null }) {
  if (!hours || !WEEKDAYS.some((d) => hours[d]?.length)) return <p className="text-sm text-muted">Hours not set. Message the seller to check availability.</p>;
  const today = BY_UTC_DAY[new Date(Date.now() + 60 * 60 * 1000).getUTCDay()]; // Lagos time
  return (
    <dl className="text-sm">
      {WEEKDAYS.map((d) => {
        const ranges = hours[d] ?? [];
        return (
          <div key={d} className={cn("flex justify-between gap-4 py-1", d === today ? "font-medium text-ink" : "text-muted")}>
            <dt>{LABEL[d]}</dt>
            <dd className="tabular text-right">{ranges.length ? ranges.map(([o, c]) => `${formatTime(o)} – ${formatTime(c)}`).join(", ") : "Closed"}</dd>
          </div>
        );
      })}
    </dl>
  );
}
