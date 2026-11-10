import { z } from "zod";

export const PlayerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(30),
  highscore: z.number().int().nonnegative(),
});

export type Player = z.infer<typeof PlayerSchema>;
