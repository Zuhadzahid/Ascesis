import Image from "next/image";

/**
 * A slim footer that mirrors the header, so the canvas sits framed between two
 * dark bands rather than running off the bottom of the window.
 */
export function AppFooter() {
  return (
    <footer className="z-30 flex h-9 shrink-0 items-center justify-between border-t border-olive-900/40 bg-olive-900 px-4 text-[11px] text-beige/70">
      <div className="flex items-center gap-1.5">
        <Image
          src="/logo.png"
          alt=""
          width={16}
          height={16}
          className="size-4 rounded-full bg-beige-100 object-contain"
        />
        <span>Ascesis</span>
        <span className="text-beige/40">·</span>
        <span>Discipline, made visible.</span>
      </div>
      <div className="hidden items-center gap-3 sm:flex">
        <span>
          <kbd className="rounded bg-beige/10 px-1">V</kbd> select, drag to box
        </span>
        <span>
          <kbd className="rounded bg-beige/10 px-1">H</kbd> hand, drag to pan
        </span>
        <span>
          <kbd className="rounded bg-beige/10 px-1">Space</kbd> + drag to pan
        </span>
      </div>
    </footer>
  );
}
