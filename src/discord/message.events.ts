import type { Message, OmitPartialGroupDMChannel, PartialMessage } from "discord.js";
import { Logger } from "../utils/logging";

export function MessageCreate(message: OmitPartialGroupDMChannel<Message<boolean>>) {
  const logger = new Logger('Discord/MessageCreate');

  if (message.author.bot) {
    logger.debug('Message Created By Bot, Ignored....')
    return;
  }

  logger.info(`Message from ${message.author.username}: ${message.content}`);
}

export function MessageUpdate(message: OmitPartialGroupDMChannel<Message<boolean> | PartialMessage>) {
  const logger = new Logger('Discord/MessageUpdate');

  if (message.author?.bot) {
    logger.debug('Message Updated By Bot, Ignored....')
    return;
  }

  logger.info(`Message from ${message.author?.username ?? 'Unknown'}: ${message.content}`);
}