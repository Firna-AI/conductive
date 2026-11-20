import { defineUseCase } from '@mokly/mokly'

export const askASideQuestion = defineUseCase({
  title: 'Ask a side question',
  description:
    'Cal asks about one line of an answer in a side session, follows it in its overlay while the parent session stays shown, and then opens it as a tab.',
  relatedDocs: [],
  steps: [
    {
      screenPath: 'app/chat/side-questions/select',
      title: 'Select a line',
      description:
        'Cal selects "Manual entry still works when there is no match." in the finished answer. Ask about this shows above the middle of the selection, and on a phone above the composer.',
    },
    {
      screenPath: 'app/chat/side-questions/select/prompt',
      title: 'Write the question',
      description:
        'A press on Ask about this opens the prompt field. Cal writes "How many saved addresses have no postcode?" and presses Send.',
    },
    {
      screenPath: 'app/chat/side-questions',
      title: 'Follow the side session',
      description:
        'The side session opens as a new tab at the end of the row, and the overlay shows it over Address autocomplete, which stays the shown tab. Its first message holds the question, the quote, and the chip of the parent session. The quote keeps a mark.',
    },
    {
      screenPath: 'app/chat/side-questions/marks/asked',
      title: 'Close the overlay',
      description:
        'Cal closes the overlay to read on. The mark shows the spinner while the side agent works.',
    },
    {
      screenPath: 'app/chat/side-questions/overlay/waiting',
      title: 'Allow the run',
      description:
        'The mark shows Needs input, and a press opens the overlay again. The side agent asks to run its count with PROD_DATABASE_URL, and Cal allows it there.',
    },
    {
      screenPath: 'app/chat/side-questions/overlay',
      title: 'Read the answer',
      description:
        'The side agent answers in the overlay, and its mark shows an ended turn.',
    },
    {
      screenPath: 'app/chat/side-questions/tab',
      title: 'Open as tab',
      description:
        'Open as tab shows the tab of the side session, with the same chat. The mark stays in the parent chat.',
    },
  ],
})
