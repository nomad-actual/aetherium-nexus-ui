# aetherium-nexus-ui

## Overview

Aetherium Nexus is a simple AI companion designed to help users with various tasks. It is built using React and TypeScript, with a focus on simplicity and ease of use.

### Complete

- [x] get basic build working
- [x] basic layout
- [x] basic chat functionality
- [x] list tool endpoints automagically
- [x] unscrew this weird spaghetti update rendering
- [x] fix annoying vite cors style-src issue
- [x] style normal response style as intended
- [x] fix main content scrolling issue
- [x] annoying input button not working
- [x] disable send in loading and fix submit
- [x] Now using correct tool call format
- [x] basic message styling (colors and backgrounds, min-width, etc)
- [x] simple loading icon
- [x] Investigate wordiness vs openwebui (possibly just use ollama webui directly)
- [x] choose better theme
- [x] improve messaging content styling
- [x] miserable ui performance on streaming (use effect?)
- [x] user submitted messages (perhaps same as ui performance - check useOptimistic state)
- [x] images from tools in content
- [x] quick n' easy autoscrolling for streaming messages
- [x] links open in new tab (somewhat curious they don't)
- [x] better scrolling experience. like it works but wow is it ghetto
- [x] snap to bottom should only work if near the bottom. otherwise, don't snap

### In Progress

- [ ] user messages also need to scroll to bottom on send
- [ ] empty initial screen input

### Prioritized

- [ ] long searches result in poor typing response (abort signals)
- [ ] Refactor components for better reusability and maintainability
- [ ] Refine scrolling behavior. It's just weird...(this might be refined when user messages are sent)
- [ ] Message Progress updater should use a nav set of steps to show what it's doing.
  - [ ] something that's like (1: digesting) --- (2: calling tool) --- (3: thinking) --- (4: answer)

### UX

- [ ] All colors are bad. Just warm slate grey and green
- [ ] Custom input component
  - [ ] multiline input
  - [ ] Enter triggers submit
  - [ ] be able to @model with autocomplete (show capabilities of all)
- [ ] Message interactivity sucks
  - [ ] Normal chat content is formatted badly (sometimes is markdown which is ok)
  - [ ] Thinking mode is massively jumbled
  - [ ] Tool results are not displayed well

### Engineering

- [ ] stats for message contents for display later
- [ ] better error handling
- [ ] going back should keep browser state?
