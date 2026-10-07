import type { TaskRow } from "@/lib/supabase/database.types";
import type { ISODate } from "@/lib/dates/core";

/** The task shape the UI works with (a thin view over the DB row). */
export interface Task {
  id: string;
  date: ISODate;
  title: string;
  details: string | null;
  hasDetails: boolean;
  completed: boolean;
  position: string;
  /** The weekly priority this task delivers, when it came from a breakdown. */
  goalId: string | null;
  createdAt: string;
}

export function fromRow(row: TaskRow): Task {
  return {
    id: row.id,
    date: row.task_date,
    title: row.title,
    details: row.details,
    hasDetails: row.has_details,
    completed: row.completed,
    position: row.position,
    goalId: row.goal_id,
    createdAt: row.created_at,
  };
}
