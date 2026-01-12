import { NextAuthConfig } from 'next-auth';
import GithubProvider from 'next-auth/providers/github';
import CredentialProvider from 'next-auth/providers/credentials';

/**
 * Edge-compatible auth configuration
 * This config doesn't use Prisma or any Node.js-specific modules
 */
export const authConfig: NextAuthConfig = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID ?? '',
      clientSecret: process.env.GITHUB_SECRET ?? '',
    }),
    // Credentials provider is configured here but authorize is handled in auth.ts
    CredentialProvider({
      credentials: {
        username: { type: 'text' },
        password: { type: 'password' },
      },
      // This will be overridden in auth.ts with the full authorize function
      authorize: async () => null,
    }),
  ],
  pages: {
    signIn: '/login',
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
        session.user.role = token.role as 'USER' | 'ADMIN' | 'DRIVER';
      }
      return session;
    },
    authorized({ auth }) {
      // This runs in edge runtime - just check if user is logged in
      return !!auth?.user;
    },

  },
};

export default authConfig;
