import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { Button, Input } from "@/components/ui";

export default function RegisterPage() {
  return (
    <AuthCard
      title="Create your account"
      description="Start organizing tender analysis in one workspace."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-blue-600">
            Log in
          </Link>
        </>
      }
    >
      <form className="space-y-4">
        <Input label="Name" placeholder="Your name" required />
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          required
        />
        <Input
          label="Password"
          type="password"
          placeholder="At least 10 characters"
          minLength={10}
          required
        />
        <Button type="submit" className="w-full">
          Create account
        </Button>
      </form>
    </AuthCard>
  );
}
