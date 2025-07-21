import React from 'react'
import Message from './Message'

import { ChatMessage } from '../types'
import { Stack } from '@mantine/core'

export type ChatHistoryProps = {
    history: ChatMessage[],
    // handleStreamingResp: (messageId: number, resp: Promise<ChatResponse>) => void
}

const ChatHistory: React.FC<ChatHistoryProps> = (props: ChatHistoryProps) => {
    const rendered = (props.history || []).map((message, index) => {
        return (
            <Message key={index} num={index} message={message}/>
        )
    })

    return (
        <Stack>
            {rendered}
        </Stack>
    )
}

export default ChatHistory;

