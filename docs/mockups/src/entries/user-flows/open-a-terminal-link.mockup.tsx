import { defineUseCase } from '@mokly/mokly'

export const openATerminalLink = defineUseCase({
  title: 'Open a terminal link',
  description:
    'The user starts the dev server in the terminal, then opens its local address from the output in the Preview tool.',
  relatedDocs: [],
  steps: [
    {
      screenPath: 'app/tools/terminal-links',
      title: 'Point at the address',
      description:
        'The dev server prints its local address, http://localhost:3000. Under the mouse pointer, the address shows an underline and the hint "⌘-click to open".',
    },
    {
      screenPath: 'app/tools/preview',
      title: 'See the preview',
      description:
        'A ⌘-click on the address opens the Preview tool at port 3000. A preview of that port that is open already shows with no new request.',
    },
  ],
})
