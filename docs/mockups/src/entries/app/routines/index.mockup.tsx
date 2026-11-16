import { defineScreen } from '@mokly/mokly'
import { RoutinesScreen, routinesSchema } from '../../../screens/RoutinesScreen'

export const routines = defineScreen({
  title: 'Automations',
  description:
    'The automations of Acme, which the Automations link below New workspace opens. Each row shows the name, the repository, the triggers, the state and the time of the last run, the person whose logins the runs use, and whether the automation is active. New automation opens an empty automation.',
  rationale:
    'The user chose option A of decision 501 on 8 November 2026: each run opens a new workspace, and the automation lists its runs. Every member sees every automation, as the user chose in decision 502 B, so the list shows the automations of all members. The link sits in the sidebar, as in Conductor, and in the list of a phone. The other states of the page are child pages, so this page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: routinesSchema,
  props: { list: 'routines', org: 'active' },
  useCasePaths: ['user-flows/create-routine'],
  render: (props, context) => (
    <RoutinesScreen state={props} viewport={context.viewport} />
  ),
})
