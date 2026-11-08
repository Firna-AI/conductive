import { defineScreen } from '@mokly/mokly'
import {
  WorkspaceListScreen,
  workspaceListSchema,
} from '../../../../screens/WorkspaceListScreen'

export const operatorMenu = defineScreen({
  title: 'Open the operator page',
  description:
    'Where an operator opens the operator page. On desktop, Operator sits in the rail above the account, here with its name as the pointer shows it. On a phone, the org switcher lists Operator under Account. People who are not operators see neither.',
  rationale:
    'The operator page belongs to no org, as the account does, so it opens from the same places as the account. The Worker setting that lists the operators also decides who sees the link.',
  relatedDocs: [],
  propSchema: workspaceListSchema,
  props: { list: 'workspaces', menu: 'operator' },
  render: (props, context) => (
    <WorkspaceListScreen state={props} viewport={context.viewport} />
  ),
})
