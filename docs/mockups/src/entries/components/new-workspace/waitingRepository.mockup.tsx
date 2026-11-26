import { defineComponent } from '@mokly/mokly'
import { WaitingRepositoryNotice } from '../../../../../../src/ui/components/new-workspace/waitingRepository'
import { repositoryWaits } from '../../../../../../src/ui/components/settings/repositoryChangeCopy'
import { repositories } from '../../../fixtures/repositories'

/**
 * The notice of a New workspace form whose repository waits for its
 * build, registered with Mokly. The form supplies the link of an admin to
 * the Cloud computer tab in the `action` slot, which only an admin gets.
 */
export const waitingRepositoryNotice = defineComponent({
  slug: 'waiting-repository-notice',
  title: 'Waiting repository notice',
  description:
    'The notice of a New workspace page or dialog while the repository of the form waits for its build, or while no chosen repository is ready. Send stays off, and the message stays. While the build runs, the notice shows a spinner. After a failed build it has the danger tone, and else the hammer. Only an admin builds the computer, so only an admin gets the link to the Cloud computer tab. Its own page shows a build that runs, as a member sees it.',
  relatedDocs: ['docs/mockups/catalogue.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['wait', 'names', 'alternative', 'admin'],
    properties: {
      /** A build runs, the newest build failed, or the changes wait. */
      wait: { enum: repositoryWaits },
      /** The names of the repositories that the form waits for. */
      names: { type: 'array', items: { type: 'string' } },
      /** Another chosen repository is ready. */
      alternative: { type: 'boolean' },
      admin: { type: 'boolean' },
    },
  } as const,
  slots: ['action'],
  props: {
    wait: 'building',
    names: [repositories['billing-service'].name],
    alternative: true,
    admin: false,
  },
  render: (props) => (
    <WaitingRepositoryNotice
      action={() => props.action}
      admin={props.admin}
      alternative={props.alternative}
      names={props.names}
      wait={props.wait}
    />
  ),
  variants: [
    {
      slug: 'failed',
      title: 'Build failed',
      description: 'The newest build failed: the danger tone.',
      props: { wait: 'failed' },
    },
    {
      slug: 'waiting',
      title: 'No build yet',
      description:
        'The changes wait for a build, and no chosen repository is ready: the hammer.',
      props: {
        wait: 'waiting',
        names: [
          repositories['billing-service'].name,
          repositories['marketing-site'].name,
        ],
        alternative: false,
      },
    },
  ],
})
