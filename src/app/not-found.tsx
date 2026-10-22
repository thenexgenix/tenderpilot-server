import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-5">
      <div className="text-center">
        <p className="text-6xl font-bold text-blue-600">404</p>
        <h1 className="mt-4 text-2xl font-bold text-[#0f2a47]">
          Tender not found
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          This page does not exist or you do not have access to it.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white"
        >
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
