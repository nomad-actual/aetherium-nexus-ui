import { Message, Ollama, Tool, ToolCall } from 'ollama'
import { getMcpClient } from './mcp.client'
import { ChatMessage } from '../types'


let ollamaClient: Ollama | null = null

const LLM = 'qwen3:4b'

async function getOllamaTools(): Promise<Tool[]> {
    const mcpClient = await getMcpClient()
    const mcpToolsResponse = await mcpClient.listTools()

    // console.log(tools.tools)
    // turn the mcpTools into ollama compatible format

    return mcpToolsResponse.tools.map((tool) => ({
        type: 'function',
        function: {
            name: tool.name,
            description: tool.description,
            parameters: {
                type: 'object',
                properties: tool.inputSchema.properties as any
            },
        },
    }))
}

function getOllamaClient() {
    if (ollamaClient) return ollamaClient
    
    ollamaClient = new Ollama({ host: 'http://ollama.homelab.ist:11434' })
    
    return ollamaClient
}

export async function submitChat(message: string) {
    const ollamaClient = getOllamaClient()
    const ollamaTools = await getOllamaTools()

    const messages = [{
        role: 'user',
        content: message,
    }]

    const iter = await ollamaClient.chat({
        model: LLM,
        messages: messages,
        stream: true,
        tools: ollamaTools
    })
    
    return iter
}

// omit the thinking responses
// tool CALLs are role: assistant with the tools definition


function formatToolResultCall(someContent: any) {
    if (!Array.isArray(someContent)) return someContent

    return someContent
        .filter(content => content.type === 'text') // for now only text is supported
        .reduce((contentAcc, contentCurr) => {
            return `${contentAcc}\n\n${contentCurr.text}`
        }, '')
}


function makeOllamaMessageHistory(messages: ChatMessage[]): Message[] {
    console.log('start make ollama history', messages)

    const validHistory: Message[] = messages.reduce((acc, cur) => {
        const contents = cur.contents.reduce((contentAcc, contentCurr) => {
            let msg: Message | null  = null

            // I think all chats should be included
            if (contentCurr.purpose === 'chat') {
                
                // check if content is actually present
                if (contentCurr.content.trim()) {
                    msg = {
                        role: cur.role,
                        content: contentCurr.content,
                    }
                }
            }
            else if (cur.role === 'assistant' && contentCurr.purpose === 'tool-request') {
                msg = {
                    role: 'assistant',
                    content: '',
                    tool_calls: contentCurr.toolCall ? [contentCurr.toolCall] : undefined
                }
            }
            else if (cur.role === 'assistant' && contentCurr.purpose === 'tool-result') {
                msg = {
                    role: 'tool',
                    content: formatToolResultCall(contentCurr.content),
                    // ignored because the stupid library 
                    // doesn't have it listed in its interfaces
                    // @ts-ignore
                    tool_name: contentCurr.toolCall?.function.name,
                }
            } else {
                // there will definitely be missed amounts
                console.log('ollama message ommitted')
            }

            if (msg) {
                return [...contentAcc, msg]
            }

            return [...contentAcc]
        }, [] as Message[])

        return [...acc, ...contents]

    }, [] as Message[])

    console.log(validHistory)
    return validHistory
}

export async function sendChat(messagesToUpdate: ChatMessage[]) {
    // build the history, consider omitting things like messages when making the history
    const ollamaMessageHistory: Message[] = makeOllamaMessageHistory(messagesToUpdate)
    
    console.log('ollama history:', ollamaMessageHistory)
    const ollamaTools = await getOllamaTools()

    const finalResp = getOllamaClient().chat({
        model: LLM,
        messages: ollamaMessageHistory,
        stream: true,
        tools: ollamaTools,
        options: {
            // temperature: 0.6,
            num_ctx: 32768,
            // top_k: 20,
            // top_p: 0.95,
            // @ts-ignore
            // min_p: 0,
        }
    })

    return finalResp
}

export type ToolCallResult = {
    role: 'tool',
    content: unknown,
    toolCall: ToolCall
}

export async function makeToolCall(toolCall: ToolCall): Promise<ToolCallResult> {
    // parse better based on message contents maybe?
    const mcpClient = await getMcpClient()

    console.log('calling tool', toolCall.function.name, 'with args', toolCall.function.arguments)

    const mcpFn = toolCall.function
    const toolResp = await mcpClient.callTool({
        name: mcpFn.name,
        arguments: mcpFn.arguments,
    })

    return {
        role: 'tool',
        content: toolResp.content,
        toolCall: toolCall,
    }
}
