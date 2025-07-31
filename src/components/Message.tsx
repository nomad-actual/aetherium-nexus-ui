import React, { useState, useRef, useEffect } from 'react'
import { MessageContent, type ChatMessage } from '../types'
import {
    Text,
    Collapse,
    Box,
    Group,
    Button,
    SimpleGrid,
    Space,
    Divider,
    Image,
} from '@mantine/core'
import { randomId } from '@mantine/hooks'
import Markdown from 'react-markdown'
import { Carousel } from '@mantine/carousel'
import { ToolCall } from 'ollama'
import CodeMirror from '@uiw/react-codemirror'
import rehypeExternalLinks from 'rehype-external-links'

export type MessageProps = {
    message: ChatMessage,
    isGenerating: boolean,
}

type CollapsedStateHolder = { [key: string]: boolean }

const Message: React.FC<MessageProps> = (props: MessageProps) => {
    const { message, isGenerating } = props
    const [collapsed, setCollapsed] = useState<CollapsedStateHolder>({})
    const refContainer = useRef(null)

    useEffect(() => {
        // really we need to snap every new user message to the bottom
        const isAtBottom = window.innerHeight + window.scrollY >= (document.body.offsetHeight - 500)

        if (isGenerating && isAtBottom) {
            // @ts-ignore
            refContainer.current?.scrollIntoView({ behavior: "smooth", block: "end" });
        }
    })

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

        // todo this sucks...perhaps this can push to an async queue instead?
        while ((token = message.buffer.pop())) {
            // search for tags
            // if none, append to the last messageContent we have

            if (token[0] === '<') {
                // likely processing a tag, so let's look for the end of it

                // we should fail this if it goes more than like 20characters
                const endIndex = token.indexOf('>')
                const tag = token.substring(0, endIndex + 1)

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

        return null
    }

    function toggleCollapse(key: number) {
        if (!collapsed[key]) setCollapsed({ ...collapsed, [key]: true })
        else setCollapsed({ ...collapsed, [key]: false })
    }

    function renderToolTextResultContent(toolContent: string | object[]) {
        if (!Array.isArray(toolContent)) {
            return toolContent
        }

        return toolContent
            // .filter((c: any) => c.type === 'text')
            .reduce((acc, content: any) => {
                // ideally we don't stringify EVERYTHING

                if (content.type === 'text') {
                    return `${acc}${JSON.stringify(content, null, 2)}\n`
                } else if (content.type === 'image') {
                    const fakeImage = JSON.stringify({
                        type: 'image',
                        mimeType: content.mimeType,
                        data: 'IMAGE ATTACHED BELOW',
                        annotations: content.annotations || {},
                    })
                    return `${acc}${fakeImage}\n`
                }

                // todo add other mcp supported types here

                return `${acc}${JSON.stringify(content, null, 2)}\n`
            }, '')

        // going to need to render the ACTUAL text results here

        // images will need to be rendered as images in the normal assistant chat response

        // return toolContent
        //     // .filter((content: any) => content.type === 'text')
        //     .reduce((acc: string, content: any) => {
        

        //         // not great but at least it's here
        //         const unsupported = JSON.stringify({
        //             type: content.type,
        //             data: 'UNSUPPORTED MEDIA (TEXT AND IMAGES ONLY)',
        //         })

        //         return `${acc}${unsupported}\n`
        //     }, '')
    }

    // only images are supported for now
    function renderToolMedia(toolContent: string | object[]) {
        if (!Array.isArray(toolContent)) {
            return toolContent
        }

        const supportedMedia = toolContent.filter(
            (content: any) => content.type === 'image'
        )
        if (supportedMedia.length === 0) {
            return null
        }

        const images = supportedMedia.map((imageContent: any) => {
            const mimeType = imageContent.mimeType || 'image/jpeg'
            const data = imageContent.data || ''
            const base64Data = `data:${mimeType};base64,${data}`

            return (
                <Carousel.Slide key={randomId()}>
                    <Image
                        radius="md"
                        src={base64Data}
                        h={470}
                        w="auto"
                        fit="contain"
                    />
                </Carousel.Slide>
            )
        })

        return (
            <>
                <Space h={'lg'} />
                <Carousel
                    slideSize={'auto'}
                    height={500}
                    slideGap="md"
                    controlsOffset="md"
                    controlSize={45}
                    withControls
                    withIndicators
                >
                    {images}
                </Carousel>
            </>
        )
    }

    function renderFormatted() {
        if (message.role === 'user') {
            return (
                <Box key={randomId()} maw={'100%'} style={{scrollMarginBottom: '200px'}} ref={refContainer}>
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
                            <Text>{msgContent.content}</Text>
                        </Collapse>
                        <Space />
                    </Box>
                )
            } else if (purpose === 'tool-result') {
                const toolResults = `Params:\n${
                    JSON.stringify(msgContent.toolCall?.function.arguments)
                }\n\nResult:\n${
                    renderToolTextResultContent(msgContent.content)
                }`

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
                            <CodeMirror
                                value={toolResults}
                                contentEditable='false'
                                placeholder=""
                                // height="200px"
                                editable={false}
                                readOnly={true}
                                theme={'dark'}
                            />
                        </Collapse>

                        {renderToolMedia(msgContent.content)}
                        {/* <Space h={"xl"}/> */}
                    </Box>
                )
            }

            if (!msgContent.content.trim()) {
                return null
            }

            return (
                <Box key={key} p={'xl'} style={{scrollMarginBottom: '200px'}} ref={refContainer}>
                    <Space h={'md'} />
                    <Markdown
                        rehypePlugins={[
                            [rehypeExternalLinks, { target: '_blank', rel: ['noopener noreferrer'] }]
                        ]}

                    >{msgContent.content || 'none2'}</Markdown>
                </Box>
            )
        })
    }

    const marginLeft = message.role === 'user' ? '20%' : '10%'
    const marginRight = message.role !== 'user' ? '20%' : '10%'
    const justifyDir = message.role === 'user' ? 'right' : 'left'
    const justify = message.role === 'user' ? 'flex-end' : 'flex-start'

    // not sure if I should keep this here or not...
    // passing stuff down to the message component
    // is proper but do streaming updates work this way?
    // should I instead useEffect or some context?
    processToken()

    // should instead be used down below
    const headerText = `${message.author} - ${message.timestamp.toLocaleTimeString()}`

    const backgroundColor = message.role === 'user' ? 'var(--mantine-color-dark-6)' : ''
    const borders = message.role === 'user' ? '1px solid var(--mantine-color-dark-5)' : ''

    return (
        <Group
            align="center"
            justify={justifyDir}
            p="sm"
            bd={borders}
            bg={backgroundColor}
            bdrs={'sm'}
            mr={marginRight}
            ml={marginLeft}
        >
            <SimpleGrid cols={1} w={'100%'}>
                <Box>
                    <Group justify={justify} align={justifyDir}>
                        <Text>{headerText}</Text>
                        <Divider w={'100%'} />
                    </Group>
                </Box>

                {renderFormatted()}
            </SimpleGrid>
        </Group>
    )
}

export default Message
