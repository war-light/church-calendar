import { DaySpec, EventType } from "../types";

/**
 * Returns all scheduled event days (Wednesday, Friday, Saturday) for a given year and month (1-indexed).
 */
export function getDaysInMonth(year: number, month: number): DaySpec[] {
  const days: DaySpec[] = [];
  const numDays = new Date(year, month, 0).getDate();

  for (let day = 1; day <= numDays; day++) {
    const dateObj = new Date(year, month - 1, day);
    const dayOfWeek = dateObj.getDay(); // 0 = Sun, 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat

    let eventType: EventType | null = null;
    if (dayOfWeek === 3) eventType = "wednesday";
    else if (dayOfWeek === 5) eventType = "friday";
    else if (dayOfWeek === 6) eventType = "saturday";

    if (eventType) {
      const yyyy = dateObj.getFullYear();
      const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
      const dd = String(dateObj.getDate()).padStart(2, "0");
      const dateStr = `${yyyy}-${mm}-${dd}`;
      days.push({ date: dateStr, eventType });
    }
  }

  return days;
}
