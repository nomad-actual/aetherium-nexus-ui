import { ToolCall } from "ollama"

export type Role = 'system' | 'user' | 'assistant' | 'tool'

export type ChatMessage = {
    id: string
    role: Role
    author: string
    buffer: string[],
    rawContent: string
    contents: MessageContent[]
    timestamp: Date
    toolCall: ToolCall | null
}




export type MessageContent = {
    type: 'text' | 'image'
    content: string // I assume image content can be converted to an image
    purpose: 'chat' | 'tool-result' | 'thinking',
    toolCall: ToolCall | null,
}
