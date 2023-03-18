import NextAuth, { DefaultSession } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from 'server/prisma';

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: {
      id: string;
      politics: string | undefined | null;
      totalScore: number;
    } & DefaultSession['user'];
  }

  interface User {
    politics: string | undefined;
    totalScore: number;
  }
}

declare module 'next-auth/jwt' {
  /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
  interface JWT {
    /** OpenID ID Token */
    userId: string;
  }
}

export default NextAuth({
  session: {
    strategy: 'jwt',
  },
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'Credentials',
      credentials: {},
      async authorize(creds, req) {
        console.log('in authorize', { req });
        // random id
        return {
          id: crypto.randomUUID(),
          politics: undefined,
          totalScore: 0,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      let user = await prisma.user.findUnique({
        where: { id: token.userId },
      });
      if (!user) {
        user = await prisma.user.create({ data: { id: token.userId } });
      }
      session.user.id = user.id;
      session.user.name = user.name;
      session.user.politics = user.politics;
      session.user.totalScore = user.totalScore;
      return session;
    },
  },
});
