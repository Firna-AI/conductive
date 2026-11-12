import { defineScreen } from '@mokly/mokly'
import {
  CreateOrgScreen,
  createOrgSchema,
} from '../../../../../screens/CreateOrgScreen'

export const createFirstOrg = defineScreen({
  title: 'First org',
  description:
    'The first org of a new user, from the second step of Get started. Create org and Cancel both return to Get started, because the user has no org to go back to. The next step connects Claude or Codex.',
  rationale:
    'Moved here from a saved state of Create org, with the same path, so that Create org shows only its canonical screen.',
  relatedDocs: [],
  propSchema: createOrgSchema,
  props: { kind: 'first', repositories: 'chosen', account: 'hidden' },
  useCasePaths: ['user-flows/join'],
  render: (props, context) => (
    <CreateOrgScreen state={props} viewport={context.viewport} />
  ),
})
