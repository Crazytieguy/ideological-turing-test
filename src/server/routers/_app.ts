/**
 * This file contains the root router of your tRPC-backend
 */
import { router, publicProcedure } from '../trpc';
import { gameRouter } from './game';
import { postRouter } from './post';

export const appRouter = router({
  healthcheck: publicProcedure.query(() => 'yay!'),

  game: gameRouter,

  post: postRouter,
});

export type AppRouter = typeof appRouter;
