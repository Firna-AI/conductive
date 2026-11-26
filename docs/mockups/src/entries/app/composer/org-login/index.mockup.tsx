import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const composerOrgLogin = defineScreen({
  title: 'Org login',
  description:
    'Cal started Address autocomplete while the org login of Acme served his new sessions, so the session runs on that login. Cal writes a message while his turn runs. The bar of the composer box says "Acme\'s login" after the model picker, also for Cal, who started the session. Every member of Acme sees the same label in this session, and each message runs on the org login. On a phone, when the bar is too narrow, the effort of the picker gives way first, then the name, each with an ellipsis.',
  rationale:
    'The user chose decision 1 B of the org logins plan on 16 November 2026: an admin connects an org login for each agent, on the Agents tab of the org settings. A session keeps the login that it took at its first message, so the prompt cache stays, from decision 105. The design calls of that plan name the org login with the name of the org, such as "Acme\'s login", where the bar names "Cal\'s login" for the login of another member. The org login is no member\'s own login, so the label shows for every member. It has no share switch, so every member of Acme sends on it, also after Cal leaves the org. The composer shows no Connect notice, because the message needs no login of the sender.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    composer: 'attachments',
    conversation: 'running',
    login: 'org',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'new-session',
      title: 'New session on the org login',
      description:
        'Priya, a member of Acme, has no Claude login of her own. She opens a new session with +. The bar of the composer box says "Acme\'s login" after the model picker, so Priya sees that the session runs on the org login. The composer shows no notice that asks to connect Claude, and Send goes on once she writes a message.',
      rationale:
        'Decision 4 of the org logins plan, which the user stated on 16 November 2026: a member of an org with a usable org login needs no login of their own, so the composer shows no Connect notice and refuses no message for a missing login. Decision 6 A: the own login of a member comes first, and the org login serves otherwise. The account names that default login for each org and agent, so the composer shows the login that the server names (option F). The session takes the org login when it accepts its first message, and it keeps that login. Its model picker follows the model list of the org endpoint, by decision 3 A, as app/chat/endpoint-models/org shows.',
      props: {
        tab: 'new-session',
        composer: 'empty',
        conversation: 'history',
        viewer: 'member',
      },
    },
    {
      slug: 'every-member',
      title: 'Org login for every member',
      description:
        'Cal has his own Claude login. An admin of Acme turned on "Use for every member" under the Claude login of Acme. Cal opens a new session with +, and the bar says "Acme\'s login" after the model picker. His older sessions keep their logins, so the session of Cal on his own login still names no login.',
      rationale:
        'The user chose decision 7 B of the org logins plan on 16 November 2026: while the switch is on, each new session in the org takes the org login, also for a member with a login of their own. While the org login cannot be used, the own login serves, and the label goes away. A session never moves to another login, so older sessions keep theirs. The label tells Cal before his first message that the session spends the org login, not his own.',
      props: {
        tab: 'new-session',
        composer: 'empty',
        conversation: 'history',
        viewer: 'admin',
      },
    },
    {
      slug: 'started-session',
      title: "Another member's new session",
      description:
        'Cal opened a new session with + and has not written in it yet. His new sessions take the org login of Acme. Priya opens that session and the model picker. The bar of the composer box says "Acme\'s login" after the model picker, because the first message takes the login of Cal\'s new sessions. The picker hides Fable 5.1, which the model list of the gateway of Acme does not name. So the menu leaves out the favourite Fable 5.1 Low, and All models leaves out Fable 5.1. The session has no messages, so no favourite shows the external link icon.',
      rationale:
        "A session takes its login at its first message, from the default login of its starter, as the design calls of the org logins plan say. The server names that default login in the record of an empty session for each member, as the agent's call of 17 November 2026 after review finding 3 says. So the label and the picker follow the login that the first message takes, not the default login of the reader, and a model of the picker follows the model list of the org endpoint (decision 3 A). So does each favourite of the menu. The record keeps no login until the first message, so a change of the default login of Cal before then still applies. When no login serves Cal, the record says so, and a message of Priya starts a new session on her own default login, as app/sessions/no-starter-login shows.",
      props: {
        tab: 'started-session',
        composer: 'picker-unlisted',
        conversation: 'history',
        viewer: 'member',
      },
    },
    {
      slug: 'removed',
      title: 'Org login removed',
      description:
        'An admin of Acme removed the Claude login of Acme. Priya opens Address autocomplete, which ran on that login, and writes a message. The notice over the composer says that the message starts a new session, because "Acme\'s Claude login is not available." The bar names no login, because the message runs on the own Claude login of Priya. The chat stays as it was. Send opens the new session, as app/sessions/linked shows.',
      rationale:
        'A design call of the org logins plan of 16 November 2026: a removal of the org login moves no session to another login. A message in a session on it starts a linked session on the default login of the sender, as a message does when the login of the starter is not available, as app/sessions/no-starter-login shows (decision 115 A). The notice shows before Send, so the member knows where the message goes. A member whom no login serves sees the notice that asks to connect, as app/composer/no-agent shows. When an admin replaces the org login instead, the session keeps it, and Try again of a turn that failed on the change uses the new key.',
      props: {
        composer: 'no-starter-login',
        conversation: 'history',
        viewer: 'member',
      },
    },
  ],
})
