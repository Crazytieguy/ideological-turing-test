import { prisma } from '../prisma';
import { authedProcedure, router } from '../trpc';
import { z } from 'zod';

export const userRouter = router({
  changePolitics: authedProcedure
    .input(z.object({ politics: z.string() }))
    .mutation(async ({ ctx, input: { politics } }) => {
      const user = await prisma.user.update({
        where: { id: ctx.user.id },
        data: { politics },
      });
      return user;
    }),
});
