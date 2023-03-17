/**
 * This file contains the root router of your tRPC-backend
 */
import { router, publicProcedure } from '../trpc';
import { gameRouter } from './game';
import { userRouter } from './user';

export const appRouter = router({
  healthcheck: publicProcedure.query(() => 'yay!'),

  game: gameRouter,

  user: userRouter,
});

export type AppRouter = typeof appRouter;
