import { defineScreen } from '@mokly/mokly'
import {
  CreateOrgScreen,
  createOrgSchema,
} from '../../../../../screens/CreateOrgScreen'

export const createOrgNoRepository = defineScreen({
  title: 'First org, no repository chosen',
  description:
    'The first org of Get started has its name, and the GitHub App reaches the 3 repositories of firna, but none is chosen yet. Create org is off. The hint under Repositories says to add at least one.',
  rationale:
    'Option E of decision 151: Create org starts the first build, and a build needs a repository, so the org needs one at create. The hint states the rule in all states, so the page needs no error when the user tries. Moved here from a saved state of Create org, with the same path, so that Create org shows only its canonical screen.',
  relatedDocs: [],
  propSchema: createOrgSchema,
  props: { kind: 'first', repositories: 'none', account: 'hidden' },
  render: (props, context) => (
    <CreateOrgScreen state={props} viewport={context.viewport} />
  ),
})
