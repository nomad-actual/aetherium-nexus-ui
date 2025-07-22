import { ToolCall } from "ollama"

export type Role = 'system' | 'user' | 'assistant' | 'tool'

export type ChatMessage = {
    id: string
    role: Role
    author: string
    buffer: string[],
    contents: MessageContent[]
    timestamp: Date
    toolCall: ToolCall | null,
    stream: Promise<void> | null
}




export type MessageContent = {
    type: 'text' | 'image'
    content: any
    purpose: 'chat' | 'tool-request' | 'tool-result' | 'thinking'
    toolCall: ToolCall | null
}
