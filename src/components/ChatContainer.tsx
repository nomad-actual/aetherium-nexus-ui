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

        // pretty much always at the end so just start looking there
        const msgToUpdate = updatedMessages.findLast((m) => m.id === message.id)
        const streamingResp = await chatPromise

        if (!msgToUpdate) {
            console.log('Could not find message to update')
            return null
        }

        let toolCalls: ToolCall[] = []

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

            // this is not streamed by nature of it 
            // really being just a web request design
            const toolResult = await makeToolCall(toolCall)

            const toolMessageRequest: MessageContent = {
                type: 'text',
                content: '',
                purpose: 'tool-request',
                toolCall: toolCall,
            }
            
            const toolMessageContent: MessageContent = {
                type: 'text',
                content: toolResult.content,
                purpose: 'tool-result',
                toolCall: toolCall,
            }

            msgToUpdate.contents = [
                ...msgToUpdate.contents,
                toolMessageRequest,
                toolMessageContent
            ]

            console.log('tool result', toolCall.function)
        }

        const updatedCopy = [...updatedMessages]
        setMessages(updatedCopy)

        const toolPromise = await sendChat(updatedCopy)
        await updateMessageByStream(msgToUpdate, updatedMessages, toolPromise)

        return null
    }

    const appendMsg = (content: string, role: Role) => {
        const author = role === 'user' ? 'Spectre' : 'Lotus'

        const newMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role,
            buffer: [],
            contents: [{
                type: 'text',
                content,
                purpose: 'chat',
                toolCall: null
            }],
            author,
            timestamp: new Date(),
            toolCall: null,
        }

        return newMsg
    }

    const handleSubmit = async (content: string, chatPromise: AbortableAsyncIterator<ChatResponse>) => {
        
        // create user submission and update immediately
        const userSubmit = appendMsg(content, 'user')
        let newMessages = [
            ...messages,
            userSubmit
        ]
        setMessages(newMessages)
        
        const assistantResponse = appendMsg('', 'assistant')
        newMessages = [
            ...newMessages,
            assistantResponse
        ]

        setMessages([...newMessages])

        try {
            await updateMessageByStream(assistantResponse, newMessages, chatPromise)
        } catch (error) {
            console.error('Error updating chat:', error)
        }
    }


    const rendered = (messages || []).map((message, index) => {
        return (
            <Message key={index} message={message} />
        )
    })



    // if no messages, show the Chat Input in the middle
    // then transition downwards?
    return (
        <AppShell padding="md" footer={{ height: 100 }}>
            <AppShell.Main>
                <Stack
                    h={"90%"}
                    align='stretch'
                    gap="xl"
                >
                    {rendered}
                </Stack>
            </AppShell.Main>

{/* if the messages are empty, do not show the footer. we'll be showing a different component instead */}
            <AppShell.Footer>
                <ChatInput onSendMessage={handleSubmit} />
            </AppShell.Footer>
        </AppShell>
    )
}

export default ChatContainer
