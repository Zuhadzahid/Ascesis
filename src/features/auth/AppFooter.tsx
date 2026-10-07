import Image from "next/image";

/**
 * A slim footer that mirrors the header, so the canvas sits framed between two
 * dark bands rather than running off the bottom of the window.
 */
export function AppFooter() {
  return (
    <footer className="z-30 flex h-9 shrink-0 items-center justify-between border-t border-chrome-border bg-chrome px-4 text-[11px] text-chrome-fg/70">
      <div className="flex items-center gap-1.5">
        <Image
          src="/logo.png"
          alt=""
          width={16}
          height={16}
          className="size-4 rounded-full bg-chrome-fg object-contain"
        />
        <span>Ascesis</span>
        <span className="text-chrome-fg/40">·</span>
        <span>Discipline, made visible.</span>
      </div>
      <div className="hidden items-center gap-3 sm:flex">
        <span>
          <kbd className="rounded bg-chrome-fg/10 px-1">V</kbd> select: click a
          card to resize, drag canvas to pan
        </span>
        <span>
          <kbd className="rounded bg-chrome-fg/10 px-1">H</kbd> hand: pan
          anywhere, move nothing
        </span>
        <span>
          <kbd className="rounded bg-chrome-fg/10 px-1">Shift</kbd> + drag to
          box-select
        </span>
      </div>
    </footer>
  );
}
