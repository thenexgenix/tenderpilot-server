import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { Button, Input } from "@/components/ui";

export default function LoginPage() {
  return (
    <AuthCard
      title="Welcome back"
      description="Sign in to continue managing your tenders."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-semibold text-blue-600">
            Create one
          </Link>
        </>
      }
    >
      <form className="space-y-4">
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          required
        />
        <Input
          label="Password"
          type="password"
          placeholder="Your password"
          required
        />
        <Button type="submit" className="w-full">
          Log in
        </Button>
      </form>
    </AuthCard>
  );
}
