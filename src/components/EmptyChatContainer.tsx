import React, { useState } from 'react'

import ChatInput from './ChatInput'
import { AbortableAsyncIterator, ChatResponse, ToolCall } from 'ollama'
import { AppShell, Center, Group, Stack } from '@mantine/core'


// pass in handlers into here so we get the messages and such


const EmptyChatContainer: React.FC = () => {
    
    // if no messages, show the Chat Input in the middle
    // then transition downwards?
    return (
        <AppShell
            padding="md"
            footer={{ height: 100 }}
        >
            <AppShell.Main>
                <Center>
                    <Group>
                        
                    </Group>
                </Center>
            </AppShell.Main>
        </AppShell>
    )
}

export default EmptyChatContainer
