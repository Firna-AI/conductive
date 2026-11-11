import { defineUseCase } from '@mokly/mokly'

export const dropAFile = defineUseCase({
  title: 'Drop a file',
  description:
    'The user drops a screenshot into the message at the place where the text names it, sends it, and opens it again from the sent message.',
  relatedDocs: [],
  steps: [
    {
      screenPath: 'app/attachments/drop',
      title: 'Drag a screenshot',
      description:
        'In Checkout address autocomplete, the user drags a screenshot from the desktop over the message box. The box shows the drop state, and the drop caret stands after "The screenshot".',
    },
    {
      screenPath: 'app/attachments/drop/dropped',
      title: 'Drop it',
      description:
        'The screenshot becomes a chip at the place of the drop, with a space after it, and its upload starts.',
    },
    {
      screenPath: 'app/attachments',
      title: 'The upload runs',
      description:
        'The chip shows the share that uploaded, and Send waits for the screenshot.',
    },
    {
      screenPath: 'app/composer',
      title: 'Send',
      description:
        'Both files are uploaded, so their chips show their sizes, and the user sends the message.',
    },
    {
      screenPath: 'app/attachments/sent',
      title: 'The agent answers',
      description:
        'The sent message keeps each chip at its place. The agent reads each file at the path of its mention, and says what the screenshot shows.',
    },
    {
      screenPath: 'app/attachments/open',
      title: 'Open the screenshot',
      description:
        'A press on the chip of the screenshot opens the file tab of its copy in the cloud computer, with its picture.',
    },
  ],
})
