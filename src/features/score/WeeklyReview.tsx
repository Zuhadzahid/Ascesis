"use client";

import { useState } from "react";
import { ScrollText } from "lucide-react";
import { writeWeeklyReview } from "@/features/ai/actions";
import { AiButton, AiMessage } from "@/features/ai/AiAssist";
import type { Goal } from "@/features/goals/queries";
import type { ISODate } from "@/lib/dates/core";
import { periodLabel } from "@/features/goals/period";
import { useWeekScores, useStreak } from "./rollups";
import { useActiveChallenge } from "@/features/challenges/queries";

interface Review {
  verdict: string;
  worked: string[];
  slipped: string[];
  changeNextWeek: string;
}

/**
 * An honest read on the week, written from the numbers rather than from
 * memory: the scores logged, the streak, which priorities landed, and which
 * rules were missed most often.
 */
export function WeeklyReview({
  weekStart,
  today,
  priorities,
  prioritiesDone,
}: {
  weekStart: ISODate;
  today: ISODate;
  priorities: Goal[];
  /** Ids of priorities counted as finished, after any rollup. */
  prioritiesDone: Set<string>;
}) {
  const { data: week } = useWeekScores(weekStart);
  const { data: streak } = useStreak(today);
  const { data: challenge } = useActiveChallenge(today);

  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState<Review | null>(null);
  const [provider, setProvider] = useState("AI");
  const [note, setNote] = useState<{ text: string; soft: boolean } | null>(null);

  const ask = async () => {
    setBusy(true);
    setNote(null);
    setReview(null);

    // Name the rules that were missed most, so the review is specific.
    const misses = challenge
      ? [...(week?.missCount ?? new Map())]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 2)
          .map(([id]) => challenge.rules.find((r) => r.id === id)?.text)
          .filter((t): t is string => !!t)
      : [];

    const result = await writeWeeklyReview({
      weekLabel: periodLabel("week", weekStart),
      averageScore: week?.average ?? 0,
      daysLogged: week?.daysLogged ?? 0,
      streak: streak?.current ?? 0,
      priorities: priorities.map((p) => ({
        title: p.title,
        done: prioritiesDone.has(p.id),
      })),
      ruleMisses: misses,
    });
    setBusy(false);

    if (!result.ok) {
      setNote({ text: result.message, soft: result.reason === "not_configured" });
      return;
    }
    setProvider(result.provider);
    setReview(result.data);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h4 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-olive">
          <ScrollText size={12} />
          Weekly review
        </h4>
        <AiButton
          label="Write it for me"
          loading={busy}
          onClick={() => void ask()}
        />
      </div>

      <p className="text-[11px] text-ink-faint">
        {week?.daysLogged
          ? `${week.daysLogged} days logged, averaging ${week.average}/100.`
          : "No days logged this week yet."}
      </p>

      {note && (
        <AiMessage
          message={note.text}
          notConfigured={note.soft}
          onDismiss={() => setNote(null)}
        />
      )}

      {review && (
        <div className="space-y-2 rounded-lg border border-teal-600/50 bg-beige-100 p-2.5 text-xs">
          <p className="font-medium text-ink">{review.verdict}</p>

          {review.worked?.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-olive">
                Worked
              </p>
              <ul className="mt-0.5 space-y-0.5">
                {review.worked.map((item, i) => (
                  <li key={i} className="text-ink-soft">
                    · {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {review.slipped?.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-olive">
                Slipped
              </p>
              <ul className="mt-0.5 space-y-0.5">
                {review.slipped.map((item, i) => (
                  <li key={i} className="text-ink-soft">
                    · {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {review.changeNextWeek && (
            <p className="border-t border-card-border pt-2 text-ink">
              <span className="font-semibold">Next week: </span>
              {review.changeNextWeek}
            </p>
          )}

          <p className="text-[10px] text-ink-faint">Written by {provider}.</p>
        </div>
      )}
    </div>
  );
}
