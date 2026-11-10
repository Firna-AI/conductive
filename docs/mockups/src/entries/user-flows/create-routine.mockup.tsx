import { defineUseCase } from '@mokly/mokly'

export const createRoutine = defineUseCase({
  title: 'Create a routine',
  description:
    'The user saves a prompt that runs an agent on a schedule, and starts its first run with Run now. The run opens a new workspace.',
  relatedDocs: [],
  steps: [
    {
      screenPath: 'app/routines',
      title: 'Open Routines',
      description:
        'Routines sits below New workspace in the sidebar. New routine opens an empty routine.',
    },
    {
      screenPath: 'app/routines/routine/new',
      title: 'Start a routine',
      description:
        'The new routine has no name, no trigger, and no prompt. The user names it Morning summary and writes the prompt.',
    },
    {
      screenPath: 'app/routines/triggers',
      title: 'Add a trigger',
      description:
        'Add trigger offers the schedules and the pull request events. The user picks Weekdays, sets 09:00, and saves.',
    },
    {
      screenPath: 'app/routines/runs/saved',
      title: 'The routine is saved',
      description:
        'Morning summary runs each weekday at 09:00 in Europe/London. It has no runs yet, so the user tries it with Run now.',
    },
    {
      screenPath: 'app/routines/runs/run-now',
      title: 'The run starts',
      description:
        'Run now starts a run at once. Its row shows Starting and opens its workspace.',
    },
    {
      screenPath: 'app/routines/run-workspace/run-now',
      title: 'The agent works',
      description:
        'The run workspace opens in General, on a new branch. The agent works on the prompt, and the header links back to the routine.',
    },
  ],
})
