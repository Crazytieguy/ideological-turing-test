import { prisma } from '../prisma';
import { authedProcedure, router } from '../trpc';
import { z } from 'zod';

export const userRouter = router({
  updateUser: authedProcedure
    .input(z.object({ politics: z.string(), name: z.string() }))
    .mutation(async ({ ctx, input: data }) => {
      const user = await prisma.user.update({
        where: { id: ctx.user.id },
        data,
      });
      return user;
    }),
});
