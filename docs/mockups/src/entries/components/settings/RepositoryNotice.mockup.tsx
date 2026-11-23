import { defineComponent } from '@mokly/mokly'
import { RepositoryNotice } from '../../../../../../src/ui/components/settings/RepositoryNotice'
import { repositoryWaits } from '../../../../../../src/ui/components/settings/repositoryChangeCopy'
import { changedNames } from '../../../fixtures/repositories'
import { actionButton } from '../common/actions.mockup'

/** The repositories that Acme added and removed. */
const both = changedNames('both')

/** A list of repository names, such as `acme/admin-dashboard`. */
const namesSchema = { type: 'array', items: { type: 'string' } } as const

/**
 * The repository notice of the Repositories and Cloud computer tabs,
 * registered with Mokly. A screen supplies the action of an admin in the
 * `action` slot.
 */
export const repositoryNotice = defineComponent({
  slug: 'repository-notice',
  title: 'Repository notice',
  description:
    'The notice of the repository changes that the org image does not hold yet, on the Repositories and Cloud computer tabs: a failed newest build, a build that runs for an added repository, with a spinner, or changes that wait for a build. An admin on the Repositories tab gets Try again or Build computer. A member reads who can act. It draws nothing when no change waits. Its own page shows an added repository that waits for a build, as an admin reads it.',
  relatedDocs: ['docs/mockups/catalogue.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['wait', 'added', 'removed', 'admin'],
    properties: {
      wait: { enum: repositoryWaits },
      /** The chosen repositories that the org image does not hold yet. */
      added: namesSchema,
      /** The repositories that the org image holds and the org no longer chose. */
      removed: namesSchema,
      admin: { type: 'boolean' },
    },
  } as const,
  slots: ['action'],
  props: { wait: 'waiting', added: both.added, removed: [], admin: true },
  render: (props) => (
    <RepositoryNotice
      action={props.action}
      added={props.added}
      admin={props.admin}
      removed={props.removed}
      wait={props.wait}
    />
  ),
  variants: [
    {
      slug: 'failed',
      title: 'Build failed',
      description:
        'The newest build failed and no build runs: a rose notice with Try again.',
      props: { wait: 'failed' },
      slots: {
        action: (
          <actionButton.Component icon="rotate-cw" tone="primary">
            Try again
          </actionButton.Component>
        ),
      },
    },
    {
      slug: 'building',
      title: 'Building',
      description:
        'A build runs for the added repository: a spinner, and no action.',
      props: { wait: 'building' },
    },
    {
      slug: 'both',
      title: 'Added and removed',
      description:
        'An added and a removed repository wait for a build, with Build computer.',
      props: { removed: both.removed },
      slots: {
        action: (
          <actionButton.Component icon="hammer" tone="primary">
            Build computer
          </actionButton.Component>
        ),
      },
    },
    {
      slug: 'member',
      title: 'Seen by a member',
      description:
        'A removed repository as a member reads it: who can act, and no action.',
      props: { added: [], removed: both.removed, admin: false },
    },
  ],
})
