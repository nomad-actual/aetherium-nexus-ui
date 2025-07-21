import React, { useState } from 'react';
import { submitChat } from '../services/ai.client'
import { AbortableAsyncIterator, ChatResponse } from 'ollama';
import { IconArrowRight, IconSearch } from '@tabler/icons-react';
import { ActionIcon, TextInput, useMantineTheme } from '@mantine/core';

type ChatInputProps = {
  onSendMessage: (message: string, chatResponse: AbortableAsyncIterator<ChatResponse>) => any;
}

const ChatInput: React.FC<ChatInputProps> = (props: ChatInputProps) => {
  const theme = useMantineTheme();
  const { onSendMessage } = props;

  const [message, setMessage] = useState<string>('');

  const handleSubmit = async (event: React.FormEvent) => {
    console.log('clicked submit button')
    event.preventDefault();
    if (message.trim()) { // disable send

      // spinner set?
      const response = await submitChat(message);

      onSendMessage(message, response).catch((err: any) => console.error(err))

      setMessage('');
    }
  };

  return (
    <TextInput
      value={message}
      onChange={(event) => setMessage(event.currentTarget.value)}
      radius="xl"
      size="md"
      placeholder="Submit to the Void..."
      rightSectionWidth={42}
      leftSection={<IconSearch size={18} stroke={1.5} />}
      rightSection={
        <ActionIcon size={32} radius="xl" color={theme.primaryColor} variant="filled">
          <IconArrowRight size={18} stroke={1.5} onClick={handleSubmit}/>
        </ActionIcon>
      }
    />
  );
};

export default ChatInput;