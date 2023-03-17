import { PrismaAdapter } from '@next-auth/prisma-adapter';
import NextAuth from 'next-auth';
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
    for (const i of new Array(100)) {
      console.error(process.env);
    }
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_SECRET must be set');
  }
  providers.push(
    GoogleProvider({
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_SECRET,
    }),
  );
}
export default NextAuth({
  // Configure one or more authentication providers
  providers,
  adapter: PrismaAdapter(prisma),
});
