import { defineScreen } from '@mokly/mokly'
import {
  CreateOrgScreen,
  createOrgSchema,
} from '../../../../../screens/CreateOrgScreen'

export const createOrgNoAccess = defineScreen({
  title: 'First org, no repository reachable',
  description:
    'The first org of Get started has its name, but the GitHub App reaches no repository of the user, for example because the install chose none. The list says to give the GitHub App access to a repository, and Manage access opens the page of the GitHub App. Create org is off.',
  rationale:
    'Option E of decision 151 adds this rejection: a user whose GitHub App reaches no repository cannot create an org until it reaches one. The empty list uses the words and the action of the app, so the page adds no new words. Moved here from a saved state of Create org, with the same path, so that Create org shows only its canonical screen.',
  relatedDocs: [],
  propSchema: createOrgSchema,
  props: { kind: 'first', repositories: 'unreachable', account: 'hidden' },
  render: (props, context) => (
    <CreateOrgScreen state={props} viewport={context.viewport} />
  ),
})
