"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { Button, Input } from "@/components/ui";

type FieldName = "name" | "email" | "password";

type RegisterResponse = {
  error?: {
    message?: string;
    fields?: Partial<Record<FieldName, string[]>>;
  };
};

export default function RegisterPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<FieldName, string>>
  >({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;

    setIsSubmitting(true);
    setFormError("");
    setSuccessMessage("");
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);

    const payload = {
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    };

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as RegisterResponse;

      if (!response.ok) {
        const fields = result.error?.fields ?? {};

        setFieldErrors({
          name: fields.name?.[0],
          email: fields.email?.[0],
          password: fields.password?.[0],
        });

        setFormError(
          result.error?.message ?? "Unable to create your account.",
        );

        return;
      }

      form.reset();
      setSuccessMessage(
        "Account created successfully. You can now log in.",
      );
    } catch {
      setFormError(
        "Unable to connect to the server. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

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
      <form className="space-y-4" onSubmit={handleSubmit}>
        {formError && (
          <p
            role="alert"
            className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {formError}
          </p>
        )}

        {successMessage && (
          <p
            role="status"
            className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700"
          >
            {successMessage}
          </p>
        )}

        <Input
          label="Name"
          name="name"
          placeholder="Your name"
          error={fieldErrors.name}
          required
        />

        <Input
          label="Email"
          name="email"
          type="email"
          placeholder="you@example.com"
          error={fieldErrors.email}
          required
        />

        <Input
          label="Password"
          name="password"
          type="password"
          placeholder="At least 10 characters"
          minLength={10}
          error={fieldErrors.password}
          required
        />

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Creating account..." : "Create account"}
        </Button>
      </form>
    </AuthCard>
  );
}