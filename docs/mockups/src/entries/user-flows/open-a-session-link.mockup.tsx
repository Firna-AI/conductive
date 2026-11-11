import { defineUseCase } from '@mokly/mokly'

export const openASessionLink = defineUseCase({
  title: 'Open a session link',
  description:
    'The user follows the session chips of a message that an agent sent: a closed session opens the page of its workspace, and an open session shows in its workspace.',
  relatedDocs: [],
  steps: [
    {
      screenPath: 'app/workspace-links/sent-by/other-workspace',
      title: 'Read a message from an agent',
      description:
        'In Saved carts, a message from the second session of Checkout address autocomplete ends with the "Sent by:" line and its session chip. The message also names a closed session of that workspace.',
    },
    {
      screenPath: 'app/workspace-links/sent-by',
      title: 'Open a closed session',
      description:
        'A press on the chip of the closed session opens Checkout address autocomplete on its workspace page, at Address autocomplete. The closed session stays in the session history. The agent of Address autocomplete works on the message that the second session sent it.',
    },
    {
      screenPath: 'app/workspace-links/session-chips',
      title: 'Open the sending session',
      description:
        'A press on the chip of the "Sent by:" line shows the second session, which sent both messages. The chip in Saved carts shows the same session.',
    },
  ],
})
