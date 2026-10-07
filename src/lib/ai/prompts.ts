import "server-only";

/**
 * Prompts live apart from the provider so they can be read, reviewed and
 * tuned without touching any vendor code.
 *
 * Every prompt asks for strict JSON and is parsed defensively: a model that
 * wraps its answer in prose or a code fence still works.
 */

const HOUSE_STYLE = `You are helping someone run a disciplined personal operating system called Ascesis.
Write like a blunt, experienced coach: concrete, specific, no motivational filler.
Prefer short plain sentences. Never use the words "journey", "unlock" or "elevate".
Respond with JSON only. No commentary before or after.`;

/** Pull JSON out of a reply that may be fenced or padded with prose. */
export function parseJson<T>(raw: string): T {
  let text = raw.trim();

  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();

  const start = text.search(/[[{]/);
  if (start > 0) text = text.slice(start);

  const lastBrace = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
  if (lastBrace !== -1) text = text.slice(0, lastBrace + 1);

  return JSON.parse(text) as T;
}

export function draftRulesPrompt(input: {
  objective: string;
  days: number;
}): { system: string; prompt: string } {
  return {
    system: HOUSE_STYLE,
    prompt: `Someone is starting a ${input.days}-day focus challenge ("Monk Mode").

Their objective: "${input.objective}"

Propose between 3 and 5 non-negotiable daily rules, and a daily deep work target in minutes.

Rules must be:
- Binary. It must be obvious at day's end whether it was kept.
- Daily. Nothing weekly or vague.
- Within their control. Not "get 10 clients", but the work that might produce clients.
- Short. Under 60 characters each.

Return JSON exactly:
{"rules": ["...", "..."], "deepWorkMinutes": 120, "note": "one sentence on the trade-off you made"}`,
  };
}

export function breakDownGoalPrompt(input: {
  goalTitle: string;
  horizon: "month" | "week";
  context?: string;
}): { system: string; prompt: string } {
  const unit = input.horizon === "month" ? "weekly priorities" : "daily tasks";
  const count = input.horizon === "month" ? "exactly 3" : "3 to 6";
  return {
    system: HOUSE_STYLE,
    prompt: `Break this goal into ${unit}.

Goal: "${input.goalTitle}"
${input.context ? `Context: ${input.context}` : ""}

Produce ${count} items. Each must be:
- A concrete piece of work, not a theme.
- Finishable in its window.
- Phrased as an action starting with a verb.
- Under 70 characters.

Return JSON exactly:
{"items": ["...", "..."]}`,
  };
}

export function expandTaskPrompt(input: {
  title: string;
  existing?: string;
}): { system: string; prompt: string } {
  return {
    system: HOUSE_STYLE,
    prompt: `Turn this task into working notes with a checklist.

Task: "${input.title}"
${input.existing ? `Existing notes to build on:\n${input.existing}` : ""}

Write markdown with:
- One or two sentences of what "done" means.
- A checklist of 3 to 7 concrete steps, as "- [ ] step".
- Nothing else. No headings, no preamble.

Return JSON exactly:
{"markdown": "..."}`,
  };
}

export function weeklyReviewPrompt(input: {
  weekLabel: string;
  averageScore: number;
  daysLogged: number;
  streak: number;
  priorities: { title: string; done: boolean }[];
  ruleMisses: string[];
}): { system: string; prompt: string } {
  return {
    system: HOUSE_STYLE,
    prompt: `Write an honest weekly review.

Week: ${input.weekLabel}
Average daily score: ${input.averageScore}/100 across ${input.daysLogged} logged days
Current streak: ${input.streak} days
Priorities:
${input.priorities.map((p) => `- ${p.done ? "DONE" : "NOT DONE"}: ${p.title}`).join("\n") || "- none set"}
Rules most often missed: ${input.ruleMisses.join(", ") || "none recorded"}

Be direct about what actually happened. If the week was poor, say so plainly without softening it. If it was good, say what caused it so it can be repeated.

Return JSON exactly:
{"verdict": "one blunt sentence", "worked": ["..."], "slipped": ["..."], "changeNextWeek": "one specific change, not a platitude"}`,
  };
}

export interface PlannerContext {
  today: string;
  weekLabel: string;
  monthLabel: string;
  activeChallenge: { title: string; endDate: string } | null;
  existingMonthly: string[];
  existingWeekly: string[];
}

/**
 * The big one: a sentence of intent becomes a plan spanning the whole ladder.
 *
 * The limits stated here mirror what the database enforces. Saying them in the
 * prompt means the model usually gets it right first time; the normaliser
 * still assumes it did not.
 */
export function planPrompt(input: {
  request: string;
  context: PlannerContext;
  previousPlan?: string;
}): { system: string; prompt: string } {
  const c = input.context;
  return {
    system: HOUSE_STYLE,
    prompt: `Build a plan for someone running a disciplined personal operating system.

THEIR REQUEST
"${input.request}"

WHERE THEY ARE
Today is ${c.today}. Current week: ${c.weekLabel}. Current month: ${c.monthLabel}.
${
  c.activeChallenge
    ? `They already have an arc running: "${c.activeChallenge.title}" until ${c.activeChallenge.endDate}. Do NOT propose another arc; plan inside the one they have.`
    : "No arc is running, so you may propose one."
}
${c.existingMonthly.length ? `Monthly targets they already have: ${c.existingMonthly.join("; ")}. Do not repeat these.` : ""}
${c.existingWeekly.length ? `Weekly priorities they already have: ${c.existingWeekly.join("; ")}. Do not repeat these.` : ""}

${input.previousPlan ? `THE PLAN YOU GAVE LAST TIME (revise it rather than starting over):\n${input.previousPlan}\n` : ""}

HARD LIMITS. Breaking these makes the plan unusable:
- An arc has between 3 and 5 rules. Each rule is daily, binary and under 60 characters.
- At most 3 monthly targets.
- At most 3 weekly priorities IN TOTAL across all monthly targets. A week holds three things, no more.
- At most 6 tasks under a weekly priority.
- Every title starts with a verb and is under 70 characters.

Weekly priorities must be finishable this week. Tasks must be doable today.
Omit any section that does not fit the request rather than padding it.

Return JSON exactly:
{
  "summary": "one or two sentences on the shape of the plan and the main trade-off",
  "challenge": {"title": "...", "objective": "...", "days": 90, "rules": ["..."], "deepWorkMinutes": 120} or null,
  "monthly": [
    {"title": "...", "weekly": [{"title": "...", "tasks": ["...", "..."]}]}
  ],
  "today": ["a task for today that belongs to no priority"]
}`,
  };
}
