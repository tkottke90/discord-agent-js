import { Client, PermissionFlagsBits } from 'discord.js';
import { Logger } from '../utils/logging.js';

/**
 * Required permissions for the Discord bot to function properly
 */
export const REQUIRED_PERMISSIONS = [
  PermissionFlagsBits.AddReactions,
  PermissionFlagsBits.AttachFiles,
  PermissionFlagsBits.CreatePublicThreads,
  PermissionFlagsBits.EmbedLinks,
  PermissionFlagsBits.ManageMessages,
  PermissionFlagsBits.ManageThreads,
  PermissionFlagsBits.MentionEveryone,
  PermissionFlagsBits.ReadMessageHistory,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.SendMessagesInThreads,
  PermissionFlagsBits.UseExternalEmojis,
  PermissionFlagsBits.ViewChannel,
] as const;

/**
 * Check if the bot has required permissions in all guilds
 */
export function checkBotPermissions(client: Client): void {
  const logger = new Logger('Discord.Permissions');

  client.guilds.cache.forEach(guild => {
    const botMember = guild.members.me;

    if (!botMember) {
      logger.warn(`Bot is not a member of guild: ${guild.name}`);
      return;
    }

    const missingPermissions = REQUIRED_PERMISSIONS.filter(
      permission => !botMember.permissions.has(permission),
    );

    if (missingPermissions.length > 0) {
      logger.error(`Missing permissions in guild "${guild.name}":`, {
        guildId: guild.id,
        missingPermissions: missingPermissions.map(p =>
          Object.keys(PermissionFlagsBits).find(
            key =>
              PermissionFlagsBits[key as keyof typeof PermissionFlagsBits] ===
              p,
          ),
        ),
      });
    } else {
      logger.info(`All required permissions present in guild: ${guild.name}`);
    }
  });
}

/**
 * Generate an invite URL with required permissions
 */
export function generateInviteUrl(clientId: string): string {
  const permissions = REQUIRED_PERMISSIONS.reduce(
    (acc, permission) => acc | permission,
    0n,
  );

  return `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=${permissions}&scope=bot`;
}
