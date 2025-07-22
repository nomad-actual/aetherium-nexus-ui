import React, { useState } from 'react';
import { submitChat } from '../services/ai.client'
import { AbortableAsyncIterator, ChatResponse } from 'ollama';
import { IconArrowRight, IconSearch } from '@tabler/icons-react';
import { ActionIcon, Center, Loader, TextInput, useMantineTheme } from '@mantine/core';

type ChatInputProps = {
  onSendMessage: (message: string, chatResponse: AbortableAsyncIterator<ChatResponse>) => any;
}

const ChatInput: React.FC<ChatInputProps> = (props: ChatInputProps) => {
  const theme = useMantineTheme();
  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState(false);


  const { onSendMessage } = props;


  const handleSubmit = async (event: React.FormEvent) => {
    console.log('clicked submit button')
    event.preventDefault();

    if (message.trim()) { // disable send

      // spinner set?
      try {
        setLoading(true);
        const response = await submitChat(message);

        setMessage('');

        onSendMessage(message, response)
          .catch((err: any) => console.error(err))
          .finally(() => {
            setLoading(false)
          });
      } catch(e) {
        console.error('Error submitting chat:', e);
      }
    }
  };

  const getActionIcon = () => {
    if (loading) {
      return (<Loader color="green" type="dots" size={18}/>)
    }

    return (<IconArrowRight size={18} stroke={1.5}/>)
  }

  return (
    <Center>
      <TextInput
        disabled={loading}
        maw={'70%'}
        miw={'70%'}
        value={message}
        onChange={(event) => setMessage(event.currentTarget.value)}
        radius="xl"
        size="lg"
        p={"lg"}
        placeholder="Submit to the Void..."
        rightSectionWidth={42}
        leftSection={<IconSearch size={18} stroke={1.5} />}
        rightSection={
          <ActionIcon
            size={32}
            radius="xl"
            color={theme.primaryColor}
            variant="filled"
            onClick={handleSubmit}
            disabled={!message.trim() || loading}
          >
            {getActionIcon()}
          </ActionIcon>
        }
      />
    </Center>
  );
};

export default ChatInput;