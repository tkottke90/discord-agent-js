import z from 'zod';
import type { Message, MessageCreateOptions, MessagePayload } from 'discord.js';

export const DiscordConfigSchema = z.object({
  token: z.string().min(1),
  inviteUrl: z.string().optional(),
});

export type DiscordConfig = z.infer<typeof DiscordConfigSchema>;

/**
 * Type representing any Discord entity that can send messages.
 * This includes channels, users, and other entities with a .send method.
 */
export interface MessageSender {
  send(
    options: string | MessagePayload | MessageCreateOptions,
  ): Promise<Message>;
}

/**
 * Type representing any Discord entity that can reply to messages.
 * This includes messages and other entities with a .reply method.
 */
export interface MessageReplier {
  reply(
    options: string | MessagePayload | MessageCreateOptions,
  ): Promise<Message>;
}

export type DiscordEvents =
  | { type: 'send:channel'; channelId: string; message: string }
  | { type: 'send:user'; userId: string; message: string }
  | {
      type: 'reply:message';
      channelId: string;
      messageId: string;
      message: string;
    };
