import NextAuth from "next-auth";
import { z } from "zod";
import { compare } from "bcryptjs";
import CredentialProvider from "next-auth/providers/credentials";
import GithubProvider from "next-auth/providers/github";
import { prisma } from "@/lib/prisma";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

/**
 * Full auth configuration with Node.js dependencies (Prisma, bcrypt)
 * This runs in Node.js runtime, not edge
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID ?? "",
      clientSecret: process.env.GITHUB_SECRET ?? "",
    }),
    CredentialProvider({
      credentials: {
        username: { type: "text" },
        password: { type: "password" },
      },
      async authorize(credentials) {
        const validated = loginSchema.safeParse(credentials);

        if (!validated.success) {
          return null;
        }

        const { username, password } = validated.data;

        const user = await prisma.user.findUnique({
          where: {
            username,
            isActive: true,
            deletedAt: null,
          },
        });
        console.log(JSON.stringify(user, null, 2));

        if (!user) {
          return null;
        }

        const passwordMatch = await compare(password, user.password);

        if (!passwordMatch) {
          console.log("password not match");
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          username: user.username,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.role = user.role;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token?.id) {
        session.user.id = String(token.id);
        session.user.username = token.username as string;
        session.user.role = token.role as "USER" | "ADMIN" | "DRIVER";
      }
      return session;
    },
  },
});
