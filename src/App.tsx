import '@mantine/core/styles.css';
import { mantineTheme } from './theme';

import { MantineProvider } from '@mantine/core';
import ChatContainer from './components/ChatContainer';


function App() {
  return (
    <MantineProvider theme={mantineTheme} forceColorScheme='dark'>
        <ChatContainer/>
    </MantineProvider>
  );
}

export default App;