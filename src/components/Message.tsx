import React from 'react'
import { type ChatMessage } from '../types'

export type MessageProps = {
    message: ChatMessage;
    num: number;
}

const Message: React.FC<MessageProps> = (props: MessageProps) => {

    const { message, num } = props;
    const direction = message.role === 'user' ? 'chat-end' : 'chat-start'

    return (
        <div key={num} className={`chat ${direction}`}>
            <div className="chat-header text-s">
                {message.author}
                <time className="text-s opacity-50">
                    {message.timestamp.toLocaleTimeString()}
                </time>
            </div>
            <div className="chat-bubble">
                {message.content}
            </div>

            {/* <div className="chat-footer opacity-50">Seen</div> */}
        </div>
    )

}

export default Message
