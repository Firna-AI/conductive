import { defineUseCase } from '@mokly/mokly'

export const explainChatText = defineUseCase({
  title: 'Explain chat text',
  description:
    'Cal explains one line of an answer. He reads the explanation in the popover by the line while the parent session stays shown, and then opens it in its tab.',
  relatedDocs: [],
  steps: [
    {
      screenPath: 'app/chat/explain/select',
      title: 'Select a line',
      description:
        'Cal selects "Manual entry still works when there is no match." in the finished answer. Explain shows above the middle of the selection, and on a phone above the composer.',
    },
    {
      screenPath: 'app/chat/explain/popover',
      title: 'Press Explain',
      description:
        'The app sends the written prompt at once. The tab of the explanation opens at the end of the row, and the popover opens below the line, with the working line under the quote.',
    },
    {
      screenPath: 'app/chat/explain/marks/running',
      title: 'Close the popover',
      description:
        'Cal closes the popover to read on. The line keeps its mark, with the spinner while the agent works.',
    },
    {
      screenPath: 'app/chat/explain/popover/run',
      title: 'Press the mark',
      description:
        'A press on the mark shows the popover again. The answer comes in.',
    },
    {
      screenPath: 'app/chat/explain',
      title: 'Read the answer',
      description:
        'The answer is there. The mark shows an ended turn, and the follow-up field takes more questions.',
    },
    {
      screenPath: 'app/chat/explain/tab',
      title: 'Expand',
      description:
        'Expand shows the tab of the explanation, with the written prompt as its first message. The mark stays in the parent chat.',
    },
  ],
})
