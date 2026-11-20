import { defineUseCase } from '@mokly/mokly'

export const useASkill = defineUseCase({
  title: 'Use a skill',
  description:
    'The user asks the agent to run a skill of the repository with `/`, and sends the message with the skill chip.',
  relatedDocs: [],
  steps: [
    {
      screenPath: 'app/skill-mentions',
      title: 'Type /pl',
      description:
        'In Checkout address autocomplete, the user types `/pl` at the start of a message. The list of skills opens above the message box, with `plans` first and highlighted.',
    },
    {
      screenPath: 'app/skill-mentions/chips',
      title: 'Pick plans',
      description:
        'Enter picks `plans`, and the text shows it as a skill chip. The user types the rest of the message after it.',
    },
    {
      screenPath: 'app/skill-mentions/chips/sent',
      title: 'Send',
      description:
        'The sent message shows the skill chip. The agent gets the skill in its own form, runs it, and writes the plan.',
    },
  ],
})
