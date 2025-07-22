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
- [x] user submitted messages don't show up until AI responding (perhaps same as ui performance - check useOptimistic state)

### Todo

- [ ] images in content
- [ ] loading message placeholder
- [ ] empty screen input
- [ ] Chat container is way too complex. Need to reintroduce components and pass in states as props.
- [ ] adjustable autoscrolling when approaching the bottom
- [ ] be able to @model with autocomplete (show capabilities of all)
- [ ] going back should keep browser state
- [ ] links open in new tab
