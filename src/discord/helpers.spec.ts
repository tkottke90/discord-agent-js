import { chunkMessage, sendMessage, sendMessages } from './helpers.js';
import type { MessageSender } from './interfaces.js';
import type { Message } from 'discord.js';

// Mock MessageSender for testing
class MockMessageSender implements MessageSender {
  public sentMessages: string[] = [];

  async send(options: string): Promise<Message> {
    this.sentMessages.push(options);
    return {} as Message; // Mock message object
  }
}

describe('Discord Helpers', () => {
  describe('chunkMessage', () => {
    it('should return single chunk for short messages', () => {
      const text = 'Hello, world!';
      const chunks = chunkMessage(text, 2000);
      expect(chunks).toEqual([text]);
    });

    it('should split long messages into multiple chunks', () => {
      const text = 'A'.repeat(3000);
      const chunks = chunkMessage(text, 2000);
      expect(chunks.length).toBe(2);
      expect(chunks[0]).toHaveLength(2000);
      expect(chunks[1]).toHaveLength(1000);
    });

    it('should respect line breaks when chunking', () => {
      const text = 'Line 1\n' + 'B'.repeat(1990) + '\nLine 3';
      const chunks = chunkMessage(text, 2000);
      expect(chunks.length).toBe(2);
      expect(chunks[0]).toBe('Line 1\n' + 'B'.repeat(1990));
      expect(chunks[1]).toBe('Line 3');
    });

    it('should handle empty strings', () => {
      const chunks = chunkMessage('', 2000);
      expect(chunks).toEqual(['']);
    });
  });

  describe('sendMessage', () => {
    it('should send a single message for short text', async () => {
      const mockSender = new MockMessageSender();
      const text = 'Hello, world!';
      
      await sendMessage(mockSender, text);
      
      expect(mockSender.sentMessages).toEqual([text]);
    });

    it('should send multiple messages for long text', async () => {
      const mockSender = new MockMessageSender();
      const text = 'A'.repeat(3000);
      
      await sendMessage(mockSender, text, 2000);
      
      expect(mockSender.sentMessages).toHaveLength(2);
      expect(mockSender.sentMessages[0]).toHaveLength(2000);
      expect(mockSender.sentMessages[1]).toHaveLength(1000);
    });
  });

  describe('sendMessages', () => {
    it('should send multiple messages in sequence', async () => {
      const mockSender = new MockMessageSender();
      const messages = ['Message 1', 'Message 2', 'Message 3'];
      
      await sendMessages(mockSender, messages);
      
      expect(mockSender.sentMessages).toEqual(messages);
    });

    it('should skip empty messages', async () => {
      const mockSender = new MockMessageSender();
      const messages = ['Message 1', '', 'Message 3'];
      
      await sendMessages(mockSender, messages);
      
      expect(mockSender.sentMessages).toEqual(['Message 1', 'Message 3']);
    });
  });

  describe('MessageSender type compatibility', () => {
    it('should work with any object that has a send method', async () => {
      // This test verifies that our MessageSender type is flexible
      const customSender = {
        async send(text: string): Promise<Message> {
          console.log(`Sending: ${text}`);
          return {} as Message;
        }
      };

      // This should compile without errors, proving type compatibility
      await sendMessage(customSender, 'Test message');
    });
  });
});
