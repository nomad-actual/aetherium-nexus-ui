import axios from 'axios'
import { AbortableAsyncIterator, ChatResponse, Ollama, Tool, ToolCall } from 'ollama'

import { getMcpClient } from './mcp.client'
import { ChatMessage } from '../types'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'


type OllamaMessage = {
    role: string;
    content: string;
    tool_calls?: any;
}

let ollamaClient: Ollama | null = null
let mcpClientInstance: Client | null = null

async function getOllamaTools(): Promise<Tool[]> {
    const mcpClient = await getMcpClient()
    const mcpToolsResponse = await mcpClient.listTools()

    // console.log(tools.tools)
    // turn the mcpTools into ollama compatible format

    const ollamaTools = mcpToolsResponse.tools.map((tool) => {
        const t: Tool = {
            type: 'function',
            function: {
                name: tool.name,
                description: tool.description,
                parameters: {
                    type: 'object',
                    properties: tool.inputSchema.properties as any
                    // properties: {
                    //     location: {
                    //         type: 'string',
                    //         description: 'location of the weather'
                    //     }
                    // }
                },
            },
        }

        return t
    })

    return ollamaTools
}

function getOllamaClient() {
    if (ollamaClient) return ollamaClient
    
    ollamaClient = new Ollama({ host: 'http://ollama.homelab.ist:11434' })
    
    return ollamaClient
}

export async function submitChat(message: string) {
    const ollamaClient = getOllamaClient()
    const ollamaTools = await getOllamaTools()

    // todo: support other content
    const messages = [
        { role: 'user', content: message, tool_calls: [] }
    ]

    return ollamaClient.chat({
        model: 'qwen3:4b',
        messages: messages,
        stream: true,
        tools: ollamaTools,
    })
}

function makeOllamaMessageHistory(messages: ChatMessage[]): OllamaMessage[] {
    return messages.map(message => {
        return {
            role: message.role,
            content: message.content,
            tool_calls: message.toolCall?.function.name ? [{ name: message.toolCall.function.name }] : []
        }
    })
}

export async function submitToolCall(toolCalls: ToolCall[], messages: ChatMessage[]) {
    const ollamaMessageHistory: OllamaMessage[] = makeOllamaMessageHistory(messages)
    
    const mcpClient = await getMcpClient()

    for (const toolCall of toolCalls) {
        console.log('calling tool', toolCall.function.name, 'with args', toolCall.function.arguments)

        const mcpFn = toolCall.function
        const toolResp = await mcpClient.callTool({
            name: mcpFn.name,
            arguments: mcpFn.arguments,
        })

        // this needs to be more robust because it won't always be a string
        // in the case of pictures, then what
        const concated = Array.isArray(toolResp.content)
            ? toolResp.content.reduce((acc, curr) => {
                if (curr.type === 'text') {
                    return `${acc} \n ${curr.text}`
                }
                else if (curr.type === 'image') {

                }
                
                return acc
            }, '')
            : toolResp.content

        ollamaMessageHistory.push({
            role: 'tool',
            content: concated,
            tool_name: mcpFn.name,
        } as any)

        console.log('tool response', toolResp)
        console.log('total message history', ollamaMessageHistory)
    }

    const ollamaTools = await getOllamaTools()

    const finalResp = getOllamaClient().chat({
        model: 'qwen3:4b',
        messages: ollamaMessageHistory,
        stream: true,
        tools: ollamaTools
    })

    return finalResp 
}
