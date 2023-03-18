import * as trpc from '@trpc/server';
// import * as trpcNext from '@trpc/server/adapters/next';
// import { NodeHTTPCreateContextFnOptions } from '@trpc/server/adapters/node-http';
// import { IncomingMessage } from 'http';
// import { getSession } from 'next-auth/react';
// import ws from 'ws';

/**
 * Creates context for an incoming request
 * @link https://trpc.io/docs/context
 */
export const createContext = async () =>
  // opts:
  //   | trpcNext.CreateNextContextOptions
  //   | NodeHTTPCreateContextFnOptions<IncomingMessage, ws>,
  {
    // TODO: this is broken, fix it when we start caring about authorization
    // const session = await getSession(opts);

    // console.log('createContext for', session?.user?.name ?? 'unknown user');

    return {
      session: null,
    };
  };

export type Context = trpc.inferAsyncReturnType<typeof createContext>;
