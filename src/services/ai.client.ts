import { Ollama, Tool, ToolCall } from 'ollama'
import { getMcpClient } from './mcp.client'
import { ChatMessage } from '../types'


type OllamaMessage = {
    role: string;
    content: string;
    tool_calls?: any;
}

let ollamaClient: Ollama | null = null

const LLM = 'qwen3:14b'

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
        tool_calls: []
    }]

    const iter = await ollamaClient.chat({
        model: LLM,
        messages: messages,
        stream: true,
        tools: ollamaTools
    })
    
    return iter
}

function makeOllamaMessageHistory(messages: ChatMessage[]): OllamaMessage[] {
    const history = messages.reduce((accumulator: OllamaMessage[], chatMessage: ChatMessage) => {
        const contents: OllamaMessage[] = chatMessage.contents.map(msgContent => {
            
            // if this is a tool-result, we need to include the name of the tool it came from
            const toolCallNames = []
            if ( msgContent.toolCall?.function.name) {
                toolCallNames.push({ name: msgContent.toolCall?.function.name })
            }

            const role = msgContent.purpose === 'tool-result' ? 'tool' : chatMessage.role

            return {
                role,
                content: msgContent.content,
                tool_calls: toolCallNames
            }
        })

        return [...accumulator, ...contents]
    }, [])

    return history
}

export async function sendChat(messagesToUpdate: ChatMessage[]) {
    // build the history, consider omitting things like messages when making the history
    const ollamaMessageHistory: OllamaMessage[] = makeOllamaMessageHistory(messagesToUpdate)
    
    console.log('ollama history:', ollamaMessageHistory)

    const ollamaTools = await getOllamaTools()
    const finalResp = getOllamaClient().chat({
        model: LLM,
        messages: ollamaMessageHistory,
        stream: true,
        tools: ollamaTools
    })

    return finalResp
}

export type ToolCallResult = {
    role: 'tool',
    content: string,
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

    // this needs to be more robust because it won't always be a string
    // in the case of pictures, then what
    // consider returning a number of results instead of just one object

    let toolContent = toolResp.content
     
    if (Array.isArray(toolContent)) {
        toolContent = toolContent.reduce((acc, curr) => {
            if (curr.type === 'text') {
                return `${acc} \n ${curr.text}` // this should be better...
            }
            else if (curr.type === 'image') {
                return `${acc} \n IMAGE PLACEHOLDER`
            }
            
            return acc
        }, '')
     }


    return {
        role: 'tool',
        content: toolContent as string,
        toolCall: toolCall,
    }
}
