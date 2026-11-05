import { defineScreen } from '@mokly/mokly'
import {
  RepositorySettingsScreen,
  repositorySettingsSchema,
} from '../../../screens/RepositorySettingsScreen'

export const repositorySettings = defineScreen({
  title: 'Repository settings',
  description:
    'The base of the repository and its state, the startup script, and the environment variables. Install software opens a terminal on the base.',
  rationale:
    'The base card says what new workspaces get and when the base updates. Values of environment variables are write-only, so a secret never reaches the browser. The user can replace a value.',
  relatedDocs: [],
  propSchema: repositorySettingsSchema,
  props: { base: 'ready' },
  render: (props, context) => (
    <RepositorySettingsScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'updating',
      title: 'Base updating',
      description:
        'A push to the default branch started an update. Each step shows its progress, and new workspaces keep the previous base until it finishes.',
      props: { base: 'updating' },
    },
    {
      slug: 'update-failed',
      title: 'Base update failed',
      description:
        'The startup script failed. The card shows the end of its output and offers Try again. New workspaces still start from the last good base.',
      props: { base: 'failed' },
    },
  ],
})
