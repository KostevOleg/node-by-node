import { describe, expect, it } from '@jest/globals';
import { validate } from 'class-validator';
import {
  CreateChatInput,
  SendMessageInput,
  UpdateMessageInput,
} from './chat.inputs';

describe('chat GraphQL inputs', () => {
  const userId = '11111111-1111-1111-1111-111111111111';
  const chatId = '22222222-2222-2222-2222-222222222222';
  const messageId = '33333333-3333-3333-3333-333333333333';

  it('rejects an empty first message when creating a chat', async () => {
    const input = new CreateChatInput();
    input.participantId = userId;
    input.firstMessage = '';

    await expect(validate(input)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: 'firstMessage',
        }),
      ]),
    );
  });

  it('rejects an empty message when sending or updating chat messages', async () => {
    const sendInput = new SendMessageInput();
    sendInput.chatId = chatId;
    sendInput.content = '';

    const updateInput = new UpdateMessageInput();
    updateInput.messageId = messageId;
    updateInput.content = '';

    await expect(validate(sendInput)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: 'content',
        }),
      ]),
    );
    await expect(validate(updateInput)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: 'content',
        }),
      ]),
    );
  });
});
