import { compare } from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validation/auth";

import {
    clearFailedLogins,
    isLoginRateLimited,
    recordFailedLogin,
} from "@/lib/login-rate-limit";

export const { handlers, auth, signIn, signOut } = NextAuth({
    session: {
        strategy: "jwt",
    },

    pages: {
        signIn: "/login",
    },

    providers: [
        Credentials({
            credentials: {
                email: {
                    label: "Email",
                    type: "email",
                },
                password: {
                    label: "Password",
                    type: "password",
                },
            },

            async authorize(credentials) {
                const result = loginSchema.safeParse(credentials);

                if (!result.success) {
                    return null;
                }

                const loginKey = result.data.email;

                if (isLoginRateLimited(loginKey)) {
                    return null;
                }

                try {
                    const user = await prisma.user.findUnique({
                        where: {
                            email: result.data.email,
                        },
                    });

                    if (!user) {
                        recordFailedLogin(loginKey);
                        return null;
                    }

                    const passwordMatches = await compare(
                        result.data.password,
                        user.passwordHash,
                    );

                    if (!passwordMatches) {
                        recordFailedLogin(loginKey);
                        return null;
                    }

                    clearFailedLogins(loginKey);

                    return {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                    };
                } catch {
                    return null;
                }
            },
        }),
    ],
});