import { defineUseCase } from '@mokly/mokly'

export const sendFeedback = defineUseCase({
  title: 'Send feedback',
  description:
    'The user tells the team about a bug from the command palette, with a screenshot.',
  relatedDocs: [],
  steps: [
    {
      screenPath: 'app/command-palette',
      title: 'Open the palette',
      description:
        'Cal presses ⌘K over the list. Send feedback comes last among the actions.',
    },
    {
      screenPath: 'app/command-palette/search/feedback',
      title: 'Search',
      description:
        'Cal types "feedback". Send feedback is the only result, and Enter opens it.',
    },
    {
      screenPath: 'app/feedback/states',
      title: 'Write a message',
      description:
        'The palette closes, and the Feedback dialog opens over the list. The message box has the focus, and Send waits for text.',
    },
    {
      screenPath: 'app/feedback',
      title: 'Paste a screenshot',
      description:
        'Cal writes what went wrong and pastes a screenshot into the message box. It shows as a chip with its name and its size.',
    },
    {
      screenPath: 'app/feedback/states/sending',
      title: 'Send',
      description:
        'Cal presses Enter. A spinner shows on Send while the message goes.',
    },
    {
      screenPath: 'app/feedback/states/sent',
      title: 'See the toast',
      description:
        'The dialog closes, and a toast thanks Cal. The team replies to the address that the dialog named.',
    },
  ],
})
