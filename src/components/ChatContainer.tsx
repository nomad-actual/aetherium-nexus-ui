import React, { useState } from 'react'

import ChatHistory from './ChatHistory'
import ChatInput from './ChatInput'
import { ChatMessage, Role } from '../types'
import { AbortableAsyncIterator, ChatResponse, ToolCall } from 'ollama'
import { submitToolCall } from '../services/ai.client'

const ChatContainer: React.FC = () => {
    const [messages, setMessages] = useState<ChatMessage[]>([])

    const handleStreamingUpdates = async (messageId: string, messagesToUpdate: ChatMessage[], chatPromise: Promise<AbortableAsyncIterator<ChatResponse>>) => {
        const nextMessages = [...messagesToUpdate]
        const msgToUpdate = nextMessages.find((msg) => msg.id === messageId)

        const streamingResp = await chatPromise
        // follow-ups or tool_calls?
        let toolCalls: ToolCall[] = []

        for await (const part of streamingResp) {
            if (!msgToUpdate) {
                console.log('msgToUpdate not found',messageId, nextMessages)
                return
            }
            
            msgToUpdate.content += part.message.content
            if (part.message.tool_calls && part.message.content === '') {
                toolCalls = part.message.tool_calls
            }

            setMessages([...nextMessages])
        }

        console.log('tooooool completed', nextMessages.find((msg) => msg.id === messageId))
    }

    const appendMsg = (content: string, role: Role, toolCall: null) => {
        console.log('appendMsg called', content, role)
        let id = crypto.randomUUID()
        const author = role === 'user' ? 'Spectre': 'Lotus'

        const newMsg: ChatMessage = {
            id,
            role,
            content,
            author,
            timestamp: new Date(),
            toolCall,
        }

        return newMsg
    }

    const handleSubmit = (content: string, chatPromise: Promise<AbortableAsyncIterator<ChatResponse>>) => {
        // submit to chat api and get the response and update the messages state
        const newMessages = [
            ...messages,
            appendMsg(content, 'user', null),
            appendMsg('Pondering...\n\n', 'assistant', null)
        ]

        const nextUpdate = [...newMessages]
        const idToUpdate = nextUpdate[nextUpdate.length - 1].id

        setMessages([...newMessages])

        // make sure the promise is done
        chatPromise.then(async (streamingResp) => {
            const toUpdate = nextUpdate.find((m) => m.id === idToUpdate)
            if (!toUpdate) {
                console.log('No message to update - submit')
                return {
                    messages: nextUpdate,
                    idToUpdate,
                    tools: [],
                    followup: []
                }
            }

            toUpdate.content = ''

            // follow-ups or tool_calls?
            let toolCalls: ToolCall[] = []

            for await (const part of streamingResp) {
                toUpdate.content += part.message.content

                // console.log('Part content:', part.message)
                if (part.message.tool_calls && part.message.content === '') {
                    toolCalls = part.message.tool_calls
                }

                setMessages([...nextUpdate])
            }

            return {
                messages: nextUpdate,
                idToUpdate,
                tools: toolCalls,
                followup: []
            }
        })
        .then(({ messages, tools, idToUpdate, followup }) => {
            if (tools.length > 0) {
                // handle tool calls here
                console.log('Tool Calls:', tools)
                const prom = submitToolCall(tools, messages)

                return handleStreamingUpdates(
                    idToUpdate,
                    messages,
                    prom
                )
            }
        })
        .catch((error) => console.error('Error:', error))
        
    }

    return (
        <div className="flex flex-col justify-between items-center mt-5 mb-8">
            <ChatHistory history={messages} />
            <ChatInput onSendMessage={handleSubmit} />
        </div>
    )
}

export default ChatContainer
