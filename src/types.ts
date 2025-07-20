import { ToolCall } from "ollama"

export type Role = 'system' | 'user' | 'assistant' | 'tool'

export type ChatMessage = {
    id: string
    role: Role
    author: string
    content: string
    timestamp: Date,
    toolCall: ToolCall | null
}