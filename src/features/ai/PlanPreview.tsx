"use client";

import { useMemo, useState } from "react";
import { Check, Flame, ListChecks, Sun, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { planCounts, type AiPlan } from "./plan";

/**
 * A plan, shown as something to argue with rather than accept.
 *
 * Every line has a checkbox and unticking a parent takes its children with it,
 * because a weekly priority without its monthly target has nothing to hang off.
 */
export function PlanPreview({
  plan,
  applying,
  onApply,
  onDiscard,
}: {
  plan: AiPlan;
  applying: boolean;
  onApply: (chosen: AiPlan) => void;
  onDiscard: () => void;
}) {
  const [useChallenge, setUseChallenge] = useState(true);
  const [dropped, setDropped] = useState<Set<string>>(new Set());

  const isOff = (key: string) => dropped.has(key);
  const toggle = (key: string) =>
    setDropped((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // Rebuild the plan from what is still ticked.
  const chosen = useMemo<AiPlan>(() => {
    const monthly = plan.monthly
      .map((m, mi) => {
        if (isOff(`m${mi}`)) return null;
        const weekly = m.weekly
          .map((w, wi) => {
            if (isOff(`w${mi}-${wi}`)) return null;
            const tasks = w.tasks.filter((_, ti) => !isOff(`t${mi}-${wi}-${ti}`));
            return { ...w, tasks };
          })
          .filter((w): w is NonNullable<typeof w> => w !== null);
        return { ...m, weekly };
      })
      .filter((m): m is NonNullable<typeof m> => m !== null);

    return {
      ...plan,
      challenge: useChallenge ? plan.challenge : null,
      monthly,
      today: plan.today.filter((_, i) => !isOff(`d${i}`)),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, useChallenge, dropped]);

  const counts = planCounts(chosen);
  const nothingLeft =
    counts.challenge + counts.monthly + counts.weekly + counts.tasks === 0;

  return (
    <div className="space-y-2 rounded-xl border border-teal-600/50 bg-beige-100 p-2.5 text-xs">
      {plan.adjustments.length > 0 && (
        <ul className="space-y-0.5 rounded-lg bg-beige-200 px-2 py-1.5 text-[10px] text-ink-soft">
          {plan.adjustments.map((note, i) => (
            <li key={i}>· {note}</li>
          ))}
        </ul>
      )}

      {plan.challenge && (
        <Section icon={<Flame size={12} />} title="Arc">
          <Row
            checked={useChallenge}
            onToggle={() => setUseChallenge((v) => !v)}
            title={`${plan.challenge.title} · ${plan.challenge.days} days`}
          />
          {useChallenge && (
            <div className="ml-6 space-y-0.5 pt-1">
              {plan.challenge.objective && (
                <p className="text-[11px] text-ink-soft">
                  {plan.challenge.objective}
                </p>
              )}
              {plan.challenge.rules.map((rule, i) => (
                <p key={i} className="text-[11px] text-ink-soft">
                  · {rule}
                </p>
              ))}
              <p className="text-[10px] text-ink-faint">
                {plan.challenge.deepWorkMinutes} min deep work a day
              </p>
            </div>
          )}
        </Section>
      )}

      {plan.monthly.length > 0 && (
        <Section icon={<Target size={12} />} title="Monthly targets">
          {plan.monthly.map((m, mi) => (
            <div key={mi} className="space-y-0.5">
              <Row
                checked={!isOff(`m${mi}`)}
                onToggle={() => toggle(`m${mi}`)}
                title={m.title}
              />
              {!isOff(`m${mi}`) &&
                m.weekly.map((w, wi) => (
                  <div key={wi} className="ml-5 space-y-0.5">
                    <Row
                      checked={!isOff(`w${mi}-${wi}`)}
                      onToggle={() => toggle(`w${mi}-${wi}`)}
                      title={w.title}
                      icon={<ListChecks size={10} className="text-olive" />}
                    />
                    {!isOff(`w${mi}-${wi}`) &&
                      w.tasks.map((t, ti) => (
                        <div key={ti} className="ml-5">
                          <Row
                            checked={!isOff(`t${mi}-${wi}-${ti}`)}
                            onToggle={() => toggle(`t${mi}-${wi}-${ti}`)}
                            title={t.title}
                            muted
                          />
                        </div>
                      ))}
                  </div>
                ))}
            </div>
          ))}
        </Section>
      )}

      {plan.today.length > 0 && (
        <Section icon={<Sun size={12} />} title="Today">
          {plan.today.map((t, i) => (
            <Row
              key={i}
              checked={!isOff(`d${i}`)}
              onToggle={() => toggle(`d${i}`)}
              title={t.title}
              muted
            />
          ))}
        </Section>
      )}

      <div className="flex items-center justify-between gap-2 border-t border-card-border pt-2">
        <span className="text-[10px] text-ink-faint">
          {nothingLeft
            ? "Nothing selected"
            : [
                counts.challenge && "1 arc",
                counts.monthly && `${counts.monthly} monthly`,
                counts.weekly && `${counts.weekly} weekly`,
                counts.tasks && `${counts.tasks} tasks`,
              ]
                .filter(Boolean)
                .join(" · ")}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onDiscard}
            disabled={applying}
            className="rounded-md px-2 py-1 text-[11px] text-ink-soft hover:bg-beige-200 disabled:opacity-50"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={() => onApply(chosen)}
            disabled={applying || nothingLeft}
            className="rounded-md bg-olive px-2.5 py-1 text-[11px] font-semibold text-beige hover:bg-olive-700 disabled:opacity-50"
          >
            {applying ? "Creating…" : "Apply plan"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-olive">
        {icon}
        {title}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function Row({
  checked,
  onToggle,
  title,
  icon,
  muted,
}: {
  checked: boolean;
  onToggle: () => void;
  title: string;
  icon?: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-start gap-1.5 rounded-md px-1 py-0.5 text-left hover:bg-beige-200/70"
    >
      <span
        className={cn(
          "mt-0.5 flex size-[14px] shrink-0 items-center justify-center rounded-[3px] border",
          checked ? "border-olive bg-olive text-beige" : "border-teal-600",
        )}
      >
        {checked && <Check size={9} strokeWidth={3} />}
      </span>
      {icon}
      <span
        className={cn(
          muted ? "text-[11px] text-ink-soft" : "text-ink",
          !checked && "line-through opacity-50",
        )}
      >
        {title}
      </span>
    </button>
  );
}
