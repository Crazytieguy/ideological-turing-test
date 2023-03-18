import { prisma } from '../prisma';
import { publicProcedure, router } from '../trpc';
import { z } from 'zod';

export const userRouter = router({
  updateUser: publicProcedure
    .input(z.object({ id: z.string(), politics: z.string(), name: z.string() }))
    .mutation(async ({ input: { id, ...data } }) => {
      const user = await prisma.user.update({
        where: { id },
        data,
      });
      return user;
    }),
});
