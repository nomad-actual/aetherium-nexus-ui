import React, { useState, useEffect } from 'react'
import { MessageContent, type ChatMessage } from '../types'
import {
    Text,
    Collapse,
    Box,
    Group,
    Button,
    Code,
    SimpleGrid,
    Space,
    Divider,
} from '@mantine/core'
import { randomId } from '@mantine/hooks'
import { ToolCall } from 'ollama'
import Markdown from 'react-markdown'

export type MessageProps = {
    message: ChatMessage
}

const Message: React.FC<MessageProps> = (props: MessageProps) => {
    const { message } = props
    const [collapsed, setCollapsed] = useState({} as any)

    const makeNewMessageContent = (
        type: 'text' | 'image',
        purpose: 'chat' | 'tool-result' | 'thinking',
        toolCall?: ToolCall | null
    ): MessageContent => {
        return {
            type,
            content: '',
            purpose,
            toolCall: toolCall || null,
        }
    }

    function processToken() {
        let token

        while ((token = message.buffer.pop())) {
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
                    const newThinkBlock = makeNewMessageContent(
                        'text',
                        'thinking'
                    )
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

        return <></>
    }

    function toggleCollapse(key: number) {
        if (!collapsed[key]) setCollapsed({ ...collapsed, [key]: true })
        else setCollapsed({ ...collapsed, [key]: false })
    }

    function renderToolResultContent(toolContent: string | object[]) {
        if (!Array.isArray(toolContent)) {
            return toolContent
        }

        // going to need to render the ACTUAL text results here

        // images will need to be rendered as images in the normal assistant chat response

        return toolContent.reduce((acc: string, content: any) => {
            if (content.type === 'text') {
                return `${acc}\n${content.text}\n`
            }
            if (content.type === 'image') {
                return `${acc}\n\n IMAGE PLACEHOLDER`
            }

            return acc
        }, '')
    }

    function renderFormatted() {
        if (message.role === 'user') {
            return (
                <Box key={randomId()} maw={'100%'}>
                    <Group justify="flex-end">
                        <Markdown>{message.contents[0]?.content}</Markdown>
                    </Group>
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
                    <Box pl={20} key={key}>
                        <Group justify="flex-start" align="left">
                            <Button 
                                miw={'250px'}
                                color="gray"
                                onClick={() => toggleCollapse(key)}
                            >
                                {/* change to 'past tense when stats are available */}
                                Pondering...
                            </Button>
                        </Group>

                        <Collapse in={collapsed[key]}>
                            <Text>
                                {msgContent.content}
                            </Text>
                        </Collapse>
                        <Space/>
                    </Box>
                )
            } else if (purpose === 'tool-result') {
                return (
                    <Box pl={20} key={key}>
                        <Group justify="flex-start" align="left">
                            <Button 
                                miw={'250px'}
                                color="green"
                                onClick={() => toggleCollapse(key)}
                            >
                                {`${msgContent.toolCall?.function.name} Results`}
                            </Button>
                        </Group>
                        <Collapse in={collapsed[key]}>
                            <Code block>
                                {`Params:\n${
                                    JSON.stringify(msgContent.toolCall?.function.arguments)
                                }\n\nResult:${
                                    renderToolResultContent(msgContent.content)
                                }`}
                            </Code>
                        </Collapse>
                        <Space/>
                    </Box>
                )
            } else {
                <Box key={key}>
                    <Text>{msgContent.content || 'none'}</Text>
                </Box>
            }

            if (!msgContent.content.trim()) {
                return null;
            }

            return (
                <Box key={key} p={'xl'}>
                    <Space h={"md"}/>
                    <Markdown>{msgContent.content || 'none2'}</Markdown>
                </Box>
            )
        })
    }

    const marginLeft = message.role === 'user' ? '20%' : '10%'
    const marginRight = message.role !== 'user' ? '20%' : '10%'
    const justifyDir = message.role === 'user' ? 'right' : 'left'
    const justify = message.role === 'user' ? 'flex-end' : 'flex-start'


    return (
        <Group
            align="center"
            justify={justifyDir}
            p="sm"
            bd={'1px solid var(--mantine-color-dark-5)'}
            bg={'var(--mantine-color-dark-6)'}
            bdrs={'sm'}
            mr={marginRight}
            ml={marginLeft}
        >
            {/* need a hook somehow instead */}
            {processToken()}

            <SimpleGrid cols={1} w={'100%'}>
                <Box>
                    <Group justify={justify}align={justifyDir}>
                        <Text>{message.author} - {message.timestamp.toLocaleTimeString()}</Text>
                        <Divider w={'100%'}/>
                    </Group>
                </Box>

                {renderFormatted()}
            </SimpleGrid>
        </Group>
    )
}

export default Message
