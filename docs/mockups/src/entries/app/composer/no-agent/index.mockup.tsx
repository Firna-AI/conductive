import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const composerNoAgent = defineScreen({
  title: 'Agent not connected',
  description:
    'Claude is not connected, for example because the user removed its login, so the message for Opus 5.5 waits and Send is off. The notice over the composer leads to the account, with the Connect form of Claude open. A member without a Claude login sees the same notice in a session of another member whose login is not available or not shared, because the message would start a new session on the login of that member.',
  rationale:
    'The user chose option D of decision 33: Get started connects an agent, and this notice catches an agent that is not connected later. Picking a model of a connected agent also lets the message go. Decision 4 of the org logins plan, which the user stated on 16 November 2026: in an org with a usable org login for Claude, a member without a Claude login of their own needs none, so the composer shows no such notice, as app/composer/org-login/new-session shows. The notice shows only when no login serves the member: no usable login of their own, and no usable org login. Moved here from a saved state of the Composer page, with the same path, so that page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, composer: 'no-agent' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
