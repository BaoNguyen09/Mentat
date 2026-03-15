export function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function scoreToPercent(score: number) {
  return Math.max(0, Math.min(100, score * 10));
}

export function formatSessionDate(isoDate: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(isoDate));
}

export function isSameLocalDay(
  leftDate: string | Date,
  rightDate: string | Date,
) {
  const left = new Date(leftDate);
  const right = new Date(rightDate);

  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

export function isToday(value: string | Date) {
  return isSameLocalDay(value, new Date());
}
