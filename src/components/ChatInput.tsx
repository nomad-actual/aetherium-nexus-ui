import React, { useState } from 'react';
import { Button, Textarea } from 'rsc-daisyui';
import { submitChat } from '../services/ai.client'
import { AbortableAsyncIterator, ChatResponse } from 'ollama';

type ChatInputProps = {
  onSendMessage: (message: string, chatResponse: Promise<AbortableAsyncIterator<ChatResponse>>) => any;
}

const ChatInput: React.FC<ChatInputProps> = (props: ChatInputProps) => {
  const { onSendMessage } = props;
  const [message, setMessage] = useState<string>('');

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(event.target?.value || '');
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (message.trim()) { // disable send
      const response = submitChat(message);

      // spinner set?
      onSendMessage(message, response).catch((err: any) => console.error(err))

      setMessage('');

    }
  };

  return (
      <div className="flex flex-row items-center px-5 mb-3 max-w-5xl mx-auto rounded-lg group">
        <form onSubmit={handleSubmit}>
          <Textarea
            value={message}
            onChange={handleChange}
            placeholder="Present your message to the Void..."
            rows={4}
            style={{
              padding: '10px',
              border: '1px solid #ccc',
              borderRadius: '5px',
              resize: 'vertical',
            }}
          />

          <Button type="submit" style={{
              width: '100px',
              height: '40px',
              borderRadius: '5px',
              backgroundColor: '#28a745',
              border: '1px solid #ccc'
            }}>
              Send
            </Button>
        </form>
    </div>
  );
};

export default ChatInput;