import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const ownEndpointLogin = defineScreen({
  title: 'Login on an own endpoint',
  description:
    'Priya opens a session that Cal started, and writes a message. Cal runs Claude on an own endpoint, a proxy at proxy.example.com, and lets other members use it. The bar of the composer box says "Cal\'s endpoint at proxy.example.com" after the model picker, so Priya sees where the message goes before Send. When the bar is narrow, the label ends with an ellipsis, so on a phone and beside the right column of a desktop it cuts the host.',
  rationale:
    'Each session runs on the login of its starter (decision 105), and an own endpoint login sends each turn to the endpoint of that starter (decision 1 A of the own endpoint plan). The messages and the files of the turn go there, not to Anthropic. So the label names the host of the endpoint, and never its full address, as the account does. A new own endpoint login is shared by default (decision 4 B), so a member can send to it without a step of their own.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, viewer: 'member', composer: 'own-endpoint' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'yours',
      title: 'Your own endpoint',
      description:
        'Cal opens the same session, which runs on the own endpoint of Cal. The bar names no login, because the message runs on the own login of Cal.',
      rationale:
        'As the user decided on 8 November 2026, the own login gets no name, because it tells the user nothing new. Cal chose the endpoint of that login, so its host is not new to Cal either.',
      props: { viewer: 'admin' },
    },
  ],
})
