const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;

type LoginAttempt = {
    count: number;
    firstFailureAt: number;
};

const globalForLoginRateLimit = globalThis as typeof globalThis & {
    loginAttempts?: Map<string, LoginAttempt>;
};

const loginAttempts =
    globalForLoginRateLimit.loginAttempts ?? new Map<string, LoginAttempt>();

if (process.env.NODE_ENV !== "production") {
    globalForLoginRateLimit.loginAttempts = loginAttempts;
}

export function isLoginRateLimited(key: string) {
    const attempt = loginAttempts.get(key);

    if (!attempt) {
        return false;
    }

    if (Date.now() - attempt.firstFailureAt >= WINDOW_MS) {
        loginAttempts.delete(key);
        return false;
    }

    return attempt.count >= MAX_FAILURES;
}

export function recordFailedLogin(key: string) {
    const now = Date.now();
    const attempt = loginAttempts.get(key);

    if (!attempt || now - attempt.firstFailureAt >= WINDOW_MS) {
        loginAttempts.set(key, {
            count: 1,
            firstFailureAt: now,
        });

        return;
    }

    attempt.count += 1;
}

export function clearFailedLogins(key: string) {
    loginAttempts.delete(key);
}