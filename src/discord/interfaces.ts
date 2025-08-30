import z from "zod";

export const DiscordConfigSchema = z.object({
  token: z.string().min(1),
  inviteUrl: z.string().optional(),
});

export type DiscordConfig = z.infer<typeof DiscordConfigSchema>;
