"use client";

import {
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

/* Button variants for primary calls to action, secondary controls, ghost buttons, and destructive actions */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-[#2563eb] text-white shadow-sm hover:bg-[#1d4ed8] hover:shadow transition-all duration-150 focus-visible:ring-4 focus-visible:ring-blue-100",
  secondary:
    "border border-slate-200 bg-white text-[#0f2a47] shadow-sm hover:border-slate-300 hover:bg-slate-50 transition-all duration-150 focus-visible:ring-4 focus-visible:ring-slate-100",
  ghost:
    "text-slate-600 hover:bg-slate-100 hover:text-[#0f2a47] transition-colors focus-visible:ring-4 focus-visible:ring-slate-100",
  danger:
    "bg-[#dc2626] text-white shadow-sm hover:bg-[#b91c1c] hover:shadow transition-all duration-150 focus-visible:ring-4 focus-visible:ring-red-100",
};

export function Button({
  className = "",
  variant = "primary",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition duration-150 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.99] ${buttonVariants[variant]} ${className}`}
      {...props}
    />
  );
}

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  hint?: string;
};

export function Input({
  label,
  error,
  hint,
  id,
  className = "",
  ...props
}: InputProps) {
  return (
    <label className="flex w-full flex-col gap-1.5 text-sm font-medium text-[#0f2a47]">
      {label && <span className="text-slate-700">{label}</span>}
      <input
        id={id}
        className={`min-h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-[#0f2a47] shadow-sm transition placeholder:text-slate-400 focus:border-[#2563eb] focus:bg-white focus:ring-4 focus:ring-blue-100 focus:outline-none ${
          error ? "border-red-300 focus:border-red-500 focus:ring-red-100" : ""
        } ${className}`}
        {...props}
      />
      {hint && !error && <span className="text-xs text-slate-400">{hint}</span>}
      {error && <span className="text-xs font-semibold text-red-600">{error}</span>}
    </label>
  );
}

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
  hint?: string;
};

export function Textarea({
  label,
  error,
  hint,
  id,
  className = "",
  ...props
}: TextareaProps) {
  return (
    <label className="flex w-full flex-col gap-1.5 text-sm font-medium text-[#0f2a47]">
      {label && <span className="text-slate-700">{label}</span>}
      <textarea
        id={id}
        className={`min-h-28 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-[#0f2a47] shadow-sm transition placeholder:text-slate-400 focus:border-[#2563eb] focus:bg-white focus:ring-4 focus:ring-blue-100 focus:outline-none ${
          error ? "border-red-300 focus:border-red-500 focus:ring-red-100" : ""
        } ${className}`}
        {...props}
      />
      {hint && !error && <span className="text-xs text-slate-400">{hint}</span>}
      {error && <span className="text-xs font-semibold text-red-600">{error}</span>}
    </label>
  );
}

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
};

export function Select({
  label,
  id,
  className = "",
  children,
  ...props
}: SelectProps) {
  return (
    <label className="flex w-full flex-col gap-1.5 text-sm font-medium text-[#0f2a47]">
      {label && <span className="text-slate-700">{label}</span>}
      <div className="relative">
        <select
          id={id}
          className={`min-h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white pr-10 pl-3.5 text-sm text-[#0f2a47] shadow-sm transition focus:border-[#2563eb] focus:ring-4 focus:ring-blue-100 focus:outline-none ${className}`}
          {...props}
        >
          {children}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </label>
  );
}

export type BadgeVariant = "blue" | "green" | "amber" | "red" | "gray";

/* Status configuration providing color tokens and matching status indicator dots */
const badgeConfig: Record<
  BadgeVariant,
  { container: string; dot: string }
> = {
  blue: {
    container: "bg-blue-50 text-blue-700 border-blue-200/80",
    dot: "bg-blue-600",
  },
  green: {
    container: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
    dot: "bg-emerald-600",
  },
  amber: {
    container: "bg-amber-50 text-amber-700 border-amber-200/80",
    dot: "bg-amber-600",
  },
  red: {
    container: "bg-red-50 text-red-700 border-red-200/80",
    dot: "bg-red-600",
  },
  gray: {
    container: "bg-slate-100 text-slate-600 border-slate-200/80",
    dot: "bg-slate-400",
  },
};

export function Badge({
  children,
  variant = "gray",
  className = "",
  showDot = true,
}: {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
  showDot?: boolean;
}) {
  const config = badgeConfig[variant];

  return (
    <span
      className={`inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${config.container} ${className}`}
    >
      {showDot && (
        <span
          className={`mr-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${config.dot}`}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}

/* Tender status configuration mapping lifecycle states to user-facing labels and color variants */
export type TenderStatusKey =
  | "DRAFT"
  | "PROCESSING"
  | "ANALYZED"
  | "ATTENTION_REQUIRED"
  | "PROCESSING_FAILED";

export function getTenderStatusLabel(status: TenderStatusKey): string {
  if (status === "ATTENTION_REQUIRED") {
    return "ATTENTION REQUIRED";
  }
  if (status === "PROCESSING_FAILED") {
    return "PROCESSING FAILED";
  }
  return status;
}

export function getTenderStatusVariant(status: TenderStatusKey): BadgeVariant {
  if (status === "ANALYZED") {
    return "green";
  }
  if (status === "PROCESSING") {
    return "blue";
  }
  if (status === "ATTENTION_REQUIRED") {
    return "amber";
  }
  if (status === "PROCESSING_FAILED") {
    return "red";
  }
  return "gray";
}

export function StatusBadge({ status }: { status: TenderStatusKey }) {
  return (
    <Badge variant={getTenderStatusVariant(status)}>
      {getTenderStatusLabel(status)}
    </Badge>
  );
}

export function Banner({
  children,
  variant = "info",
}: {
  children: ReactNode;
  variant?: "info" | "success" | "warning" | "error";
}) {
  const styles = {
    info: "border-blue-200 bg-blue-50/70 text-blue-900",
    success: "border-emerald-200 bg-emerald-50/70 text-emerald-900",
    warning: "border-amber-200 bg-amber-50/70 text-amber-900",
    error: "border-red-200 bg-red-50/70 text-red-900",
  };

  const icons = {
    info: (
      <svg className="h-5 w-5 shrink-0 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    success: (
      <svg className="h-5 w-5 shrink-0 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    warning: (
      <svg className="h-5 w-5 shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    error: (
      <svg className="h-5 w-5 shrink-0 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 rounded-xl border p-4 text-sm leading-relaxed ${styles[variant]}`}
    >
      {icons[variant]}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200/90 bg-white shadow-sm">
      <table className="w-full min-w-[760px] text-left text-sm text-slate-700">
        {children}
      </table>
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-xl bg-slate-200/80 ${className}`} />
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/70 px-6 py-14 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-sm ring-1 ring-blue-100">
        <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </div>
      <h3 className="text-base font-bold text-[#0f2a47]">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-slate-500">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
          <h2 className="text-lg font-bold text-[#0f2a47]">{title}</h2>
          <button
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

export function Toast({
  message,
  variant = "success",
  duration = 4000,
  onClose,
}: {
  message: string;
  variant?: "success" | "error";
  duration?: number;
  onClose?: () => void;
}) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration <= 0) return;
    const timer = setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!isVisible) return null;

  const styles =
    variant === "success"
      ? "bg-emerald-600 text-white shadow-emerald-900/20"
      : "bg-red-600 text-white shadow-red-900/20";

  return (
    <div
      role="status"
      className={`fixed right-5 bottom-5 z-50 flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold shadow-xl transition-all ${styles}`}
    >
      <span>{message}</span>
      <button
        onClick={() => {
          setIsVisible(false);
          onClose?.();
        }}
        className="opacity-70 hover:opacity-100"
        aria-label="Dismiss toast"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
