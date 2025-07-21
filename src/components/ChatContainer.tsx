import React, { useState } from 'react'

import ChatInput from './ChatInput'
import { ChatMessage, MessageContent, Role } from '../types'
import { AbortableAsyncIterator, ChatResponse, ToolCall } from 'ollama'
import { makeToolCall, sendChat } from '../services/ai.client'
import { AppShell, Stack } from '@mantine/core'
import Message from './Message'

const ChatContainer: React.FC = () => {
    const [messages, setMessages] = useState<ChatMessage[]>([])

    const updateMessageByStream = async (
        message: ChatMessage,
        messagesToUpdate: ChatMessage[],
        chatPromise: AbortableAsyncIterator<ChatResponse>
    ) => {
        const updatedMessages = [...messagesToUpdate]
        const msgToUpdate = updatedMessages.find((m) => m.id === message.id)
        const streamingResp = await chatPromise

        if (!msgToUpdate) {
            console.log('Could not find message to update', message.id)
            return null
        }

        let toolCalls: ToolCall[] = []
        setMessages([...updatedMessages])

        for await (const part of streamingResp) {
            msgToUpdate.buffer.unshift(part.message.content)
            
            // signifies intent to call a tool
            // need to never unset because the final streamed update can be
            // a response with no tool_calls which would set the array to undefined
            if (part.message.tool_calls) {
                toolCalls = [...toolCalls, ...part.message.tool_calls]
            }

            // push updates as we get them
            setMessages([...updatedMessages])
        }

        if (toolCalls && toolCalls.length === 0) {
            console.log('no tool calls found, returning')
            return null
        }

        for (const toolCall of toolCalls) {
            console.log('making tool call', toolCall.function)
            const toolResult = await makeToolCall(toolCall)

            // because this isn't streamed, we just append it to the message contents
            // I don't like it but it works for now
            const toolMessageContent: MessageContent = {
                type: 'text',
                content: toolResult.content,
                purpose: 'tool-result',
                toolCall: toolCall,
            }

            msgToUpdate.contents = [...msgToUpdate.contents, toolMessageContent]
            // msgToUpdate.buffer.unshift(`<tool-result>${JSON.stringify(toolResult)}</tool-result>`)

            console.log('tool result', toolCall.function)
        }

        setMessages([...updatedMessages])

        const toolPromise = await sendChat([...updatedMessages])
        await updateMessageByStream(msgToUpdate, updatedMessages, toolPromise)

        return null
    }

    const appendMsg = (content: string, role: Role) => {
        let id = crypto.randomUUID()
        const author = role === 'user' ? 'Spectre' : 'Lotus'

        const newMsg: ChatMessage = {
            id,
            role,
            buffer: [],
            rawContent: content,
            contents: [
                { type: 'text', content, purpose: 'chat', toolCall: null },
            ],
            author,
            timestamp: new Date(),
            toolCall: null,
        }

        return newMsg
    }

    const handleSubmit = async (content: string, chatPromise: AbortableAsyncIterator<ChatResponse>) => {
        const newMessages = [
            ...messages,
            appendMsg(content, 'user'),
            appendMsg('', 'assistant'),
        ]

        const nextUpdate = [...newMessages]
        const toUpdate = nextUpdate[nextUpdate.length - 1]

        setMessages([...newMessages])

        try {
            await updateMessageByStream(toUpdate, newMessages, chatPromise)
        } catch (error) {
            console.error('Error updating chat:', error)
        }
    }


    const rendered = (messages || []).map((message, index) => {
        return (
            <Message key={index} num={index} message={message}/>
        )
    })



    // if no messages, show the Chat Input in the middle
    // then transition downwards?
    return (
        <AppShell>
            <AppShell.Main>
                <Stack>
                    {rendered}
                </Stack>
            </AppShell.Main>

            <AppShell.Footer
                style={{padding: '50px' }}
            >
                <ChatInput onSendMessage={handleSubmit} />
            </AppShell.Footer>
        </AppShell>
    )
}

export default ChatContainer
