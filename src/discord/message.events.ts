import type { Message, OmitPartialGroupDMChannel, PartialMessage } from "discord.js";
import { Logger } from "../utils/logging";
import { OllamaClient } from '../agents/llm-clients/ollama.client';

const ollama = new OllamaClient();

export async function MessageCreate(message: OmitPartialGroupDMChannel<Message<boolean>>) {
  const logger = new Logger('Discord.MessageCreate');

  if (message.author.bot) {
    logger.debug('Message Created By Bot, Ignored....')
    return;
  }

  if (!message.channel.isTextBased()) {
    const guild = message.guild?.name;
    const channel = message.channelId;

    logger.debug(`Voice channel [  ${guild} ] - [ ${channel} ], ignored...`)
    return;
  }

  logger.info(`Message from ${message.author.username}: ${message.content}`);

  try {
    // Check if bot has necessary permissions
    if (message.guild && !message.guild.members.me?.permissions.has(['ReadMessageHistory', 'SendMessages'])) {
      logger.error('Bot missing required permissions: ReadMessageHistory, SendMessages');
      return;
    }

    const { response } = await ollama.generate({
      model: 'mistral:7b',
      system: 'You are a helpful assistant. Respond to the users message',
      prompt: message.content
    });

    // Await the reply to handle any permission errors
    await message.reply(response);
    logger.debug('Successfully sent reply');

  } catch (error) {
    logger.error('Error processing message:', (error as Error).message);

    // Try to send a simple error message if possible
    try {
      // await message.channel.send('Sorry, I encountered an error processing your message.');
       await message.reply('Sorry, I encountered an error processing your message.');
    } catch (replyError) {
      logger.error('Failed to send error reply:', replyError);
    }
  }
}

export function MessageUpdate(message: OmitPartialGroupDMChannel<Message<boolean> | PartialMessage>) {
  const logger = new Logger('Discord.MessageUpdate');

  if (message.author?.bot) {
    logger.debug('Message Updated By Bot, Ignored....')
    return;
  }

  logger.info(`Message from ${message.author?.username ?? 'Unknown'}: ${message.content}`);
}