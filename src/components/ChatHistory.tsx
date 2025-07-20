import React, { useState } from 'react'
import Message from './Message'

import { ChatMessage } from '../types'
import { ChatResponse } from 'ollama'

export type ChatHistoryProps = {
    history: ChatMessage[],
    // handleStreamingResp: (messageId: number, resp: Promise<ChatResponse>) => void
}

const ChatHistory: React.FC<ChatHistoryProps> = (props: ChatHistoryProps) => {
    // context would be themes
    // useContext()


    const rendered = (props.history || []).map((message, index) => {
        return (
            <Message key={index} num={index} message={message}/>
        )
    })

    return <div 
        className='flex flex-col justify-between px-5 mb-3 w-full max-w-5xl mx-auto rounded-lg group'
        >
            {rendered}
        </div>
}

export default ChatHistory;

