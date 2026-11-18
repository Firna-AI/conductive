import { defineScreen } from '@mokly/mokly'
import {
  getStartedFirstRun,
  GetStartedScreen,
  getStartedSchema,
} from '../../../../../screens/GetStartedScreen'

export const getStartedDeletedOrgs = defineScreen({
  title: 'Only a deleted org',
  description:
    'Cal deleted Acme Labs, his only org. A person whose orgs are all deleted counts as a person with no org, so the app opens Get started, and Create org is the next step. Before the steps, the Deleted orgs list shows Acme Labs with the day when everything is deleted and Restore. Restore opens the org again. The list shows only while the person has a deleted org, so the other pages of Get started have none.',
  rationale:
    'On 12 November 2026 the user moved Restore from the rail to the Account page. A phone shows Get started without the rail, so it has no way to the Account page. On 13 November 2026 the user chose option C: Get started shows the same list as the Account page, and only while a deleted org exists. A person who wants a new org still sees Create org.',
  relatedDocs: [],
  propSchema: getStartedSchema,
  props: {
    ...getStartedFirstRun,
    step: 'org',
    agent: 'connected',
    deletedOrgs: 'restorable',
  },
  render: (props, context) => (
    <GetStartedScreen state={props} viewport={context.viewport} />
  ),
})
