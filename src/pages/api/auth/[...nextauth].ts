import { PrismaAdapter } from '@next-auth/prisma-adapter';
import NextAuth, { DefaultSession } from 'next-auth';
import { AppProviders } from 'next-auth/providers';
// import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { prisma } from 'server/prisma';

let useMockProvider = process.env.NODE_ENV === 'test';
const { GOOGLE_CLIENT_ID, GOOGLE_SECRET, NODE_ENV, APP_ENV } = process.env;
if (
  (NODE_ENV !== 'production' || APP_ENV === 'test') &&
  (!GOOGLE_CLIENT_ID || !GOOGLE_SECRET)
) {
  console.log('⚠️ Using mocked Google auth correct credentials were not added');
  useMockProvider = true;
}
const providers: AppProviders = [];
if (useMockProvider) {
  console.log("mock provider doesn't actually work");
  // providers.push(
  //   CredentialsProvider({
  //     id: 'google',
  //     name: 'Mocked Google',
  //     async authorize(credentials) {
  //       if (credentials) {
  //         const user = {
  //           id: credentials.name,
  //           name: credentials.name,
  //           email: credentials.name,
  //         };
  //         return user;
  //       }
  //       return null;
  //     },
  //     credentials: {
  //       name: { type: 'test' },
  //     },
  //   }),
  // );
} else {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_SECRET) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_SECRET must be set');
  }
  providers.push(
    GoogleProvider({
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_SECRET,
    }),
  );
}
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
      politics: string | undefined;
      totalScore: number;
    } & DefaultSession['user'];
  }

  interface User {
    politics: string | undefined;
    totalScore: number;
  }
}

export default NextAuth({
  // Configure one or more authentication providers
  providers,
  adapter: PrismaAdapter(prisma),
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.politics = user.politics;
        session.user.totalScore = user.totalScore;
      }
      return session;
    },
  },
});
