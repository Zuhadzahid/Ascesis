import Link from "next/link";
import Image from "next/image";
import { CalendarDays, Flame, StickyNote } from "lucide-react";

export default function LandingPage() {
  return (
    // Pinned to the default theme. The marketing page is the product's face to
    // someone who has never seen it, so it stays on brand regardless of what a
    // signed-in user picked for their own canvas. This works because the
    // [data-theme] rules match any element, not just :root.
    <main data-theme="ascesis" className="min-h-full bg-beige">
      {/* Nav */}
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <Logo />
          <span className="text-lg font-semibold text-ink">Ascesis</span>
        </div>
        <nav className="flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-sm font-medium text-ink-soft hover:text-ink"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-olive px-4 py-2 text-sm font-semibold text-beige shadow-card hover:bg-olive-700"
          >
            Get started
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-6 pt-12 pb-10 text-center">
        <p className="mb-4 text-sm font-medium tracking-[0.18em] text-olive uppercase">
          A personal operating system
        </p>
        <h1 className="text-4xl leading-tight font-semibold text-ink sm:text-5xl">
          Monk Mode,
          <br /> on one calm canvas.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-ink-soft">
          Set your non-negotiables, run a thirty, sixty or ninety day arc, and
          see the whole week laid out in front of you. No scattered notes, no
          forgotten work.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/signup"
            className="rounded-xl bg-olive px-6 py-3 text-sm font-semibold text-beige shadow-float hover:bg-olive-700"
          >
            Start your arc
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-card-border bg-card px-6 py-3 text-sm font-semibold text-ink shadow-card hover:bg-beige-100"
          >
            I have an account
          </Link>
        </div>
      </section>

      {/* Canvas preview */}
      <section className="mx-auto max-w-5xl px-6">
        <CanvasPreview />
      </section>

      {/* Features */}
      <section className="mx-auto grid max-w-5xl gap-5 px-6 py-16 sm:grid-cols-3">
        <Feature
          icon={<Flame size={20} />}
          title="Run an arc"
          body="Pick three to five rules you will not break. They land on every day of the challenge automatically, and the streak keeps you honest."
        />
        <Feature
          icon={<CalendarDays size={20} />}
          title="See the whole week"
          body="Seven day columns on an infinite canvas. Drag work between days, zoom out to a month, or focus on today alone."
        />
        <Feature
          icon={<StickyNote size={20} />}
          title="Score the day"
          body="Rules kept, deep work done, and an honest evening rating become one number. Watch it compound week over week."
        />
      </section>

      {/* The name */}
      <section className="mx-auto max-w-2xl px-6 pb-16 text-center">
        <p className="text-sm leading-relaxed text-ink-soft">
          <span className="font-semibold text-ink">Ascesis</span>{" "}
          <span className="text-ink-faint">(uh-SEE-sis)</span> is the old word
          for the training a monk undertakes. Not punishment. Practice, repeated
          daily, until it becomes who you are.
        </p>
      </section>

      <footer className="border-t border-card-border/60 py-8 text-center text-sm text-ink-faint">
        Ascesis · Discipline, made visible.
      </footer>
    </main>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-card-border bg-card p-5 shadow-card">
      <div className="flex size-10 items-center justify-center rounded-xl bg-tea text-olive">
        {icon}
      </div>
      <h3 className="mt-3 font-semibold text-ink">{title}</h3>
      <p className="mt-1 text-sm text-ink-soft">{body}</p>
    </div>
  );
}

function Logo() {
  return (
    <Image
      src="/logo.png"
      alt=""
      width={40}
      height={40}
      className="size-10 object-contain"
      priority
    />
  );
}

/** A small static mock of the canvas, using the exact palette. */
function CanvasPreview() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const sample: Record<string, string[]> = {
    Mon: ["Complete WordPress website", "Reply to client email"],
    Tue: ["Office task review", "Gym at 6pm"],
    Wed: ["Design canvas mockups"],
    Thu: ["Invoice batch", "Call supplier"],
    Fri: ["Ship v1", "Team retro"],
    Sat: ["Groceries"],
    Sun: [],
  };
  return (
    <div className="wc-dotgrid overflow-x-auto rounded-3xl border border-card-border bg-beige p-5 shadow-float">
      <div className="flex min-w-[720px] gap-3">
        {days.map((d, i) => (
          <div
            key={d}
            className="flex-1 rounded-2xl border border-card-border bg-tea/70 p-2"
          >
            <div
              className={`mb-2 rounded-lg px-2 py-1 text-xs font-semibold ${
                i === 2 ? "bg-teal text-ink" : "text-ink-soft"
              }`}
            >
              {d}
            </div>
            <div className="space-y-1.5">
              {sample[d].map((t) => (
                <div
                  key={t}
                  className="rounded-lg border border-card-border bg-card px-2 py-1.5 text-[11px] leading-snug text-ink"
                >
                  {t}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
