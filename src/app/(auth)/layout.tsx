import Link from "next/link";
import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="wc-dotgrid flex min-h-full flex-col items-center justify-center bg-beige px-6 py-10">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <Image
          src="/logo.png"
          alt=""
          width={40}
          height={40}
          className="size-10 object-contain"
          priority
        />
        <span className="text-lg font-semibold text-ink">Ascesis</span>
      </Link>
      {children}
    </main>
  );
}
