import React, { useState } from 'react'

import { ChatMessage, MessageContent, Role } from '../types'
import { AbortableAsyncIterator, ChatResponse, ToolCall } from 'ollama'
import { makeToolCall, sendChat, submitChat } from '../services/ai.client'
import { ActionIcon, AppShell, Center, Loader, Stack, TextInput, useMantineTheme } from '@mantine/core'
import Message from './Message'
import { IconArrowRight, IconSearch } from '@tabler/icons-react'

const ChatContainer: React.FC = () => {
    const theme = useMantineTheme();
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [userMessage, setUserMessage] = useState<string>('');
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
            stream: null,
        }

        return newMsg
    }

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        console.log('clicked submit button')

        const inputFieldMessage = userMessage.trim()
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
        }
    }


    const rendered = (messages || []).map((message, index) => {
        return (
            <Message key={index} message={message} />
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
                        value={userMessage}
                        onChange={(event) => setUserMessage(event.currentTarget.value)}
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
                                disabled={!userMessage.trim() || loading}
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
