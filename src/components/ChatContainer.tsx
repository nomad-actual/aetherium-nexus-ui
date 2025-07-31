import React, { useEffect, useState, useRef } from 'react'

import { ChatMessage, MessageContent, Role } from '../types'
import { AbortableAsyncIterator, ChatResponse, ToolCall } from 'ollama'
import { makeToolCall, sendChat, submitChat } from '../services/ai.client'
import { ActionIcon, AppShell, Center, Loader, Stack, TextInput, useMantineTheme } from '@mantine/core'
import Message from './Message'
import { IconArrowRight, IconSearch } from '@tabler/icons-react'

const ChatContainer: React.FC = () => {
    const theme = useMantineTheme();
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [updatingMessage, setUpdatingMessage] = useState<ChatMessage | null>(null)
    const [userInputContent, setUserMessage] = useState<string>('');
    const [loading, setLoading] = useState(false);

    const updateMessageByStream = async (
        message: ChatMessage,
        messagesToUpdate: ChatMessage[],
        streamingIter: AbortableAsyncIterator<ChatResponse>
    ) => {
        const updatedMessages = [...messagesToUpdate]


        // pretty much always at the end so just start looking there
        const msgToUpdate = updatedMessages.findLast((m) => m.id === message.id)
        if (!msgToUpdate) {
            throw new Error('Could not find message to update')
        }

        setUpdatingMessage(msgToUpdate)

        if (!msgToUpdate) {
            console.log('Could not find message to update')
            return null
        }

        let toolCalls: ToolCall[] = []

        for await (const part of streamingIter) {
            msgToUpdate.buffer.unshift(part.message.content)
            
            // signifies intent to call a tool
            // need to never unset because the final streamed update can be
            // a response with no tool_calls which would set the array to undefined
            if (part.message.tool_calls) {
                toolCalls = [...toolCalls, ...part.message.tool_calls]
            }

            // instead of setting ALL messages. I could just update the one in question...

            // setMessages([...updatedMessages])
            setUpdatingMessage({ ...msgToUpdate, buffer: msgToUpdate.buffer })
        }

        if (toolCalls && toolCalls.length === 0) {
            console.log('no tool calls found, returning')
            setUpdatingMessage(null)
            return null
        }

        for (const toolCall of toolCalls) {
            console.log('making tool call', toolCall.function)

            // todo set Message status to loading tool (and which tool is being)
            // called.

            // this is not streamed because it's really just a web request
            const toolResult = await makeToolCall(toolCall)

            const toolRequest: MessageContent = {
                type: 'text',
                content: '',
                purpose: 'tool-request',
                toolCall: toolCall,
            }
            
            const toolResults: MessageContent = {
                type: 'text',
                content: toolResult.content,
                purpose: 'tool-result',
                toolCall: toolCall,
            }

            msgToUpdate.contents = [
                ...msgToUpdate.contents,
                toolRequest,
                toolResults
            ]

            console.log('tool result', toolCall.function)
        }

        const updatedCopy = [...updatedMessages]
        setMessages(updatedCopy)

        const toolPromise = await sendChat(updatedCopy)
        await updateMessageByStream(msgToUpdate, updatedMessages, toolPromise)

        setUpdatingMessage(null)
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
            stream: null,
        }

        return newMsg
    }

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        console.log('user clicked submit button')

        const inputFieldMessage = userInputContent.trim()
        if (!inputFieldMessage) {
            return;
        }


        // create user submission and update immediately
        const userSubmit = appendMsg(inputFieldMessage, 'user')
        const assistantResponse = appendMsg('', 'assistant')

        const newMessages = [
            ...messages,
            userSubmit,
            assistantResponse
        ]

        setLoading(true);
        setUserMessage('');
        setMessages([...newMessages])

        try {
            const chatPromise = await submitChat([...messages, userSubmit]);
            await updateMessageByStream(assistantResponse, newMessages, chatPromise)
        } catch (error) {
            console.error('Error updating chat:', error)
        } finally {
            setLoading(false)
            setUpdatingMessage(null)
        }
    }


    const rendered = (messages || []).map((message, index) => {
        const isGenerating = message.id === updatingMessage?.id

        return (
            <Message key={index} message={message} isGenerating={isGenerating}/>
        )
    })


    const getActionIcon = () => {
    if (loading) {
      return (<Loader color="green" type="dots" size={18}/>)
    }

    return (<IconArrowRight size={18} stroke={1.5}/>)
  }

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
                <Center>
                    <TextInput
                        disabled={loading}
                        maw={'70%'}
                        miw={'70%'}
                        value={userInputContent}
                        onChange={(event) => setUserMessage(event.currentTarget.value)}
                        radius="xl"
                        size="lg"
                        p={"lg"}
                        placeholder="Ask the Void if you dare..."
                        rightSectionWidth={42}
                        leftSection={<IconSearch size={18} stroke={1.5} />}
                        rightSection={
                            <ActionIcon
                                size={32}
                                radius="xl"
                                color={theme.primaryColor}
                                variant="filled"
                                onClick={handleSubmit}
                                disabled={!userInputContent.trim() || loading}
                            >
                                {getActionIcon()}
                            </ActionIcon>
                        }
                    />
    </Center>
            </AppShell.Footer>
        </AppShell>
    )
}

export default ChatContainer
