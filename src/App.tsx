import '@mantine/core/styles.css';
import { MantineProvider } from '@mantine/core';
import ChatContainer from './components/ChatContainer';

function App() {
  return (
    <MantineProvider>
        <ChatContainer/>
    </MantineProvider>
  );
}

export default App;