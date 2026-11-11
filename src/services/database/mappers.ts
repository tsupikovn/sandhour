import { tasks as tasksTable } from './schema';
import { nowISO } from '@/utils/date';
import type { Task } from '@/types/task';

export type TaskRow = typeof tasksTable.$inferSelect;

/** Map a raw `tasks` row to the domain `Task` (null → undefined, 0/1 → boolean). */
export function mapTaskRow(row: TaskRow): Task {
  return {
    id: row.id,
    text: row.text,
    completed: Boolean(row.completed),
    completedAt: row.completedAt ?? undefined,
    createdAt: row.createdAt ?? nowISO(),
    targetDate: row.targetDate,
    scheduledTime: row.scheduledTime ?? undefined,
    priority: row.priority ?? 0,
    inAttic: Boolean(row.inAttic),
    movedToAtticAt: row.movedToAtticAt ?? undefined,
    isPlan: Boolean(row.isPlan),
  };
}
