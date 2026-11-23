import { defineUseCase } from '@mokly/mokly'

export const pauseTheMigrationJob = defineUseCase({
  title: 'Pause the migration job',
  description:
    'An operator pauses the migration job of the host connection on the Providers tab, while steps run on boat.',
  relatedDocs: [],
  steps: [
    {
      screenPath: 'app/operator/providers/migration',
      title: 'The job runs',
      description:
        'On 24 November at 11:46, the job runs on every org. boat runs 3 brief starts and has 1,229 starts left.',
    },
    {
      screenPath: 'app/operator/providers/migration/pausing',
      title: 'Pause job',
      description:
        'The job starts no new step, and the 3 running steps go on to their end. The job and boat show Pausing with the count of those steps.',
    },
    {
      screenPath: 'app/operator/providers/migration/paused',
      title: 'The steps end',
      description:
        'By 11:58, the 3 steps ended, and no step runs. The job and boat show Paused, and boat has 1,226 starts left.',
    },
  ],
})
