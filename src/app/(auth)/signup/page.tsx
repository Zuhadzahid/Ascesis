import { AuthForm } from "@/features/auth/AuthForm";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : "/app";
  return <AuthForm mode="signup" next={next} />;
}
