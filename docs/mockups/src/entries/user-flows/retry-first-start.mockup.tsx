import { defineUseCase } from '@mokly/mokly'

export const retryFirstStart = defineUseCase({
  title: 'Try a failed first start again',
  description:
    'The first start of a new workspace fails. The workspace stays with its chat and its queue, and any member can add a message and try again.',
  relatedDocs: [],
  steps: [
    {
      screenPath: 'app/new-workspace/waiting',
      title: 'Messages wait',
      description:
        'The first start of Lisbon runs. Two messages wait in the queue.',
    },
    {
      screenPath: 'app/new-workspace/error',
      title: 'The start fails',
      description:
        'Lisbon stays with the message that the app saved for the start, its chat, and its queue. The composer still takes messages.',
    },
    {
      screenPath: 'app/new-workspace/error/member',
      title: 'Another member writes',
      description:
        'Priya opens Lisbon from her list and writes a third message. Send puts it in the queue.',
    },
    {
      screenPath: 'app/new-workspace/retrying',
      title: 'Try again',
      description:
        'A new sandbox starts in the same workspace. The three messages wait in their order, and the agent gets them when the sandbox is ready.',
    },
  ],
})
