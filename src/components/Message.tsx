import React, { useState } from 'react'
import { MessageContent, type ChatMessage } from '../types'
import {
    Blockquote,
    Text,
    Container,
    Collapse,
    Box,
    Group,
    Button,
    Code
} from '@mantine/core'
import { randomId } from '@mantine/hooks'
import { ToolCall } from 'ollama'
import Markdown from 'react-markdown'

export type MessageProps = {
    message: ChatMessage
    num: number
}

const Message: React.FC<MessageProps> = (props: MessageProps) => {
    const { message } = props
    const [collapsed, setCollapsed] = useState({} as any)

    const makeNewMessageContent = (
        type: 'text' | 'image',
        purpose: 'chat' | 'tool-result' | 'thinking',
        toolCall?: ToolCall | null,
    ): MessageContent => {
        return {
            type,
            content: '',
            purpose,
            toolCall: toolCall || null,
        }
    }

    function processToken() {
        let token;

        while (token = message.buffer.pop()) {
            if (!token) return

            if (token[0] === '<') {
                // likely processing a tag, so let's look for the end of it

                const endIndex = token.indexOf('>')
                const tag = token.substring(0, endIndex + 1)

                // if (tag === '<tool-result>') {
                //     const toolResultRaw = token
                //         .replace('<tool-result>', '')
                //         .replace('</tool-result>', '')

                //     const toolCallResult: ToolCallResult = JSON.parse(toolResultRaw)

                //     // we make the block all at once
                //     const toolBlock = {
                //         ...makeNewMessageContent('text', 'tool-result'),
                //         content: toolCallResult.content,
                //         toolCall: toolCallResult.toolCall
                //     }
                //     message.contents = [...message.contents, toolBlock]
                // } else if (tag === '<response>') {
                if (tag === '<response>') {
                    // there can only be one response per message at this time
                    const newTextChat = makeNewMessageContent('text', 'chat')
                    message.contents = [...message.contents, newTextChat]
                } else if (tag === '<think>') {
                    console.log('found think tag')
                    const newThinkBlock = makeNewMessageContent('text', 'thinking')
                    message.contents = [...message.contents, newThinkBlock]
                } else if (token.includes('</think>')) {
                    console.log('found close think tag')

                    // who knows what this is...
                    const newThinkBlock = makeNewMessageContent('text', 'chat')
                    message.contents = [...message.contents, newThinkBlock]
                } else {
                    console.log('found unsupported token:', token)
                }
            } else {
                let lastBlock = message.contents[message.contents.length - 1]

                if (!lastBlock) {
                    lastBlock = makeNewMessageContent('text', 'chat')
                    message.contents.push(lastBlock)
                }

                lastBlock.content += token
            }
        }

        return (<></>)
    }


    function toggleCollapse(key: number) {
        if (!collapsed[key])
            setCollapsed({...collapsed, [key]: true })
        else
            setCollapsed({...collapsed, [key]: false })
    }

    function renderFormatted() {
        if (message.role === 'user') {
            return (
                <Box key={randomId()} maw={'100%'} mx="auto">
                    <Markdown>
                        {message.contents[0]?.content}
                    </Markdown>
                </Box>
            )
        }


        // assistant, system, tool roles
        return message.contents.map((msgContent, index) => {
            const purpose = msgContent.purpose
            const key = index

            if (purpose === 'thinking') {
                // funny if it changed after the tool call(s) (might consider that)
                return (
                    <Box key={key} maw={600} mx="auto">
                        <Group justify="center" mb={5}>
                            <Button 
                            color='gray' 
                            onClick={() => toggleCollapse(key)}
                        >
                                Pondering...
                            </Button>
                        </Group>

                        <Collapse in={collapsed[key]}>
                            <Blockquote color="green">
                                {msgContent.content}
                            </Blockquote>
                        </Collapse>
                    </Box>
                )
            } else if (purpose === 'tool-result') {
                return (
                    <Box key={key} maw={600} mx="auto">
                        
                        <Group justify="center" mb={5}>
                            <Button 
                            color='blue' 
                            onClick={() => toggleCollapse(key)}
                        >
                                {`${msgContent.toolCall?.function.name}`} Result...
                            </Button>
                        </Group>
                        <Collapse in={collapsed[key]}>
                            <Code block>
                                {`Params: ${JSON.stringify(msgContent.toolCall?.function.arguments)}`}
                                <br />
                                {msgContent.content}
                            </Code>
                        </Collapse>
                    </Box>
                )
            } else {
                <Box key={key} maw={400} mx="auto">
                    <Text>{msgContent.content}</Text>
                </Box>
            }

            return (
                <Box key={key} maw={'100%'} mx="auto">
                    <Markdown>{msgContent.content}</Markdown>
                </Box>
            )
        })
    }

    const direction = message.role === 'user' ? 'end' : 'start'

    return (
        <Group align="center" justify="space-between">
            <Container>
                {message.author} -
                <time className="">
                    {message.timestamp.toLocaleTimeString()}
                </time>

                {/* So this is going to be the processed message chunks */}
                {renderFormatted()}


                {processToken()}
            </Container>
        </Group>
    )
}

export default Message
