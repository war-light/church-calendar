export type EventType = "wednesday" | "friday" | "saturday";

export interface Member {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
}

export interface MonthRecord {
  id: string;
  year: number;
  month: number;
  is_current: boolean;
}

export interface Assignment {
  id: string;
  month_id: string;
  day_date: string;
  event_type: EventType;
  member_id: string | null;
  locked: boolean;
}
