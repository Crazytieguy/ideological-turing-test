import { prisma } from 'server/prisma';
import { authedProcedure, router } from 'server/trpc';
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
