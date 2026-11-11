import { and, eq } from 'drizzle-orm';
import { getDb } from '@/services/database/client';
import { tasks } from '@/services/database/schema';
import { todayISO, nowISO } from '@/utils/date';
import type { AIContext, AIPermissions } from '@/types/ai';

/** Gather the user's current context from the DB, honouring data permissions. */
export async function buildAIContext(perms: AIPermissions): Promise<AIContext> {
  const ctx: AIContext = { currentDateTime: nowISO() };

  if (perms.tasks) {
    const rows = await getDb()
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.targetDate, todayISO()),
          eq(tasks.inAttic, false),
          eq(tasks.isPlan, false)
        )
      );
    ctx.todayTasks = rows.map((r) => ({
      text: r.text,
      completed: Boolean(r.completed),
      priority: r.priority ?? 0,
      ...(r.scheduledTime ? { time: r.scheduledTime } : {}),
    }));
  }

  if (perms.attic) {
    const rows = await getDb()
      .select({ id: tasks.id })
      .from(tasks)
      .where(eq(tasks.inAttic, true));
    ctx.atticSummary = { totalCount: rows.length };
  }

  return ctx;
}

const SYSTEM_PROMPT_BASE = `You are a personal productivity assistant built into Sandhour, a day-planner widget.
Depending on what the user has allowed, you can see their tasks for today and
how many postponed tasks sit in their Attic.

Give practical, specific advice grounded in the user's actual data. Avoid
generic phrases. Suggest concrete actions that can be done right now or
scheduled for a specific time.

When planning, leave buffers between tasks and do not propose unrealistic
plans. If the user looks overloaded, say so honestly.

Reply briefly and to the point, in the language the user writes in.

User context:
`;

export function buildSystemPrompt(ctx: AIContext): string {
  return SYSTEM_PROMPT_BASE + JSON.stringify(ctx, null, 2);
}
