import { defineUseCase } from '@mokly/mokly'

export const askAboutChatText = defineUseCase({
  title: 'Ask about chat text',
  description:
    'Cal asks his own question about one line of an answer. He writes it in the popover by the line, reads the answer there while the parent session stays shown, and then opens the explanation in its tab.',
  relatedDocs: [],
  steps: [
    {
      screenPath: 'app/chat/explain/select',
      title: 'Select a line',
      description:
        'Cal selects "Manual entry still works when there is no match." in the finished answer. Explain and Ask show above the middle of the selection, and on a phone above the composer.',
    },
    {
      screenPath: 'app/chat/explain/ask',
      title: 'Press Ask',
      description:
        'The popover opens at once below the line, which keeps its highlight. The field is empty and has the focus, and Send is off. Nothing starts yet.',
    },
    {
      screenPath: 'app/chat/explain/ask/typed',
      title: 'Write the question',
      description:
        'Cal writes "Does manual entry still fill the city from the postcode?". Send turns on.',
    },
    {
      screenPath: 'app/chat/explain/ask/sent',
      title: 'Send',
      description:
        'The app sends the written prompt, with the question as its first line. The tab of the explanation opens at the end of the row, with the question as its title. The line takes its mark, and the popover shows the working line.',
    },
    {
      screenPath: 'app/chat/explain/ask/answered',
      title: 'Read the answer',
      description:
        'The answer is there. The mark shows an ended turn, and the follow-up field takes more questions.',
    },
    {
      screenPath: 'app/chat/explain/ask/tab',
      title: 'Expand',
      description:
        'Expand shows the tab of the explanation, with the written prompt as its first message. The mark stays in the parent chat.',
    },
  ],
})
