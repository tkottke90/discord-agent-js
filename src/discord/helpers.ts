
import type { Message } from 'discord.js';
import type { MessageSender } from './interfaces.js';

/**
 * Splits a message into chunks if it exceeds Discord's character limit
 * @param text - The text to split
 * @param maxLength - Maximum length per chunk (default: 2000 for Discord)
 * @returns Array of text chunks
 */
export function chunkMessage(text: string, maxLength: number = 2000): string[] {
  if (text.length <= maxLength) {
    return [text];
  }

  const chunks: string[] = [];
  let currentChunk = '';

  // Split by lines first to avoid breaking in the middle of sentences
  const lines = text.split('\n');

  for (const line of lines) {
    // If a single line is longer than maxLength, we need to split it
    if (line.length > maxLength) {
      // If we have content in currentChunk, save it first
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }

      // Split the long line by words
      const words = line.split(' ');
      for (const word of words) {
        if (currentChunk.length + word.length + 1 > maxLength) {
          if (currentChunk.length > 0) {
            chunks.push(currentChunk.trim());
            currentChunk = word;
          } else {
            // Single word is longer than maxLength, force split
            chunks.push(word.substring(0, maxLength));
            currentChunk = word.substring(maxLength);
          }
        } else {
          currentChunk += (currentChunk.length > 0 ? ' ' : '') + word;
        }
      }
    } else {
      // Check if adding this line would exceed the limit
      const potentialChunk = currentChunk + (currentChunk.length > 0 ? '\n' : '') + line;
      if (potentialChunk.length > maxLength) {
        // Save current chunk and start new one
        if (currentChunk.length > 0) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = line;
      } else {
        currentChunk = potentialChunk;
      }
    }
  }

  // Add the last chunk if it has content
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Sends a message to any Discord entity that has a .send method
 * Automatically chunks the message if it's too long
 * @param sender - Any Discord entity with a .send method (channel, user, etc.)
 * @param text - The message text to send
 * @param maxLength - Maximum length per message chunk (default: 2000)
 * @returns Promise resolving to array of sent messages
 */
export async function sendMessage(
  sender: MessageSender,
  text: string,
  maxLength: number = 1800
): Promise<Message[]> {
  const chunks = chunkMessage(text, maxLength);
  const sentMessages: Message[] = [];

  for (const chunk of chunks) {
    try {
      const message = await sender.send(chunk);
      sentMessages.push(message);
    } catch (error) {
      console.error('Failed to send message chunk:', error);
      throw error;
    }
  }

  return sentMessages;
}

/**
 * Sends multiple messages in sequence with optional delay
 * @param sender - Any Discord entity with a .send method
 * @param messages - Array of message texts to send
 * @param delayMs - Optional delay between messages in milliseconds
 * @returns Promise resolving to array of sent messages
 */
export async function sendMessages(
  sender: MessageSender,
  messages: string[],
  delayMs: number = 0
): Promise<Message[]> {
  const sentMessages: Message[] = [];

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    if (!message) continue;

    try {
      const sent = await sendMessage(sender, message);
      sentMessages.push(...sent);

      // Add delay between messages if specified (except for the last message)
      if (delayMs > 0 && i < messages.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } catch (error) {
      console.error(`Failed to send message ${i + 1}:`, error);
      throw error;
    }
  }

  return sentMessages;
}