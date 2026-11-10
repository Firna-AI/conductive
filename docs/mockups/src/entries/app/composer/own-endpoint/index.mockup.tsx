import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const ownEndpointLogin = defineScreen({
  title: 'Login on an own endpoint',
  description:
    'Priya opens a session that Cal started, and writes a message. Cal runs Claude on an own endpoint, a proxy at proxy.example.com, and lets other members use it. The bar of the composer box says "Cal\'s endpoint at proxy.example.com" after the model picker, so Priya sees where the message goes before Send. In a narrow bar the words before the host give way first, with an ellipsis, so the host stays visible on a phone and beside the right column of a desktop.',
  rationale:
    'Each session runs on the login of its starter (decision 105). On an own endpoint login, the gateway of the app sends each model request of the turn to the endpoint of that starter (decision 1 A of the own endpoint plan, and gateway decision 10 B). The messages and the files of the turn go there, not to Anthropic. As Cal chose for decision 5 C on 10 November 2026, the session record carries the host of that endpoint only while Cal shares a login that works. The label names that host, and never the full address, as the account does. The host tells the sender where the message goes, so the words before it give way first. When Cal does not share the login, or the login does not work, a message of Priya starts a new session on her own login, as app/composer/not-shared shows, and nothing names the host. A new own endpoint login is shared by default (decision 4 B), so a member can send to it without a step of their own.',
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
