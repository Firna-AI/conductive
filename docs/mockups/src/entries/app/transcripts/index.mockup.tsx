import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../screens/workspaceState'

export const transcripts = defineScreen({
  title: 'Copy a transcript',
  description:
    'Transcript copied. Cal opened the menu of the Address autocomplete tab, which does not show, and chose Copy full transcript. The menu closed, and a toast at the bottom right says "Transcript copied". The clipboard holds the session as Markdown, with every fold open. Untitled, the new session, stays the shown tab, so the chat in view does not change. On a phone, the menu was a sheet, and the toast spans the bottom of the screen.',
  rationale:
    'The user chose option B of decision 213 on 9 November 2026: the server builds the Markdown from the stored events of the session, so a tab that never showed copies its whole session too. The user chose option B of decision 215 on the same day: Copy concise transcript copies the chat as it shows at first, with each fold closed, and Copy full transcript copies it with every fold open. A design call of the same day keeps the shown tab, as Rename session does, because Conductor fixed a copy that switched to the tab of the menu. The menu closes on the press, so a toast gives the result, in the words of Copy link. It is the toast of the app, at the place of its other toasts.',
  relatedDocs: ['docs/protocol/session-transcripts.md'],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, tab: 'new-session', copyTranscript: 'copied' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'failed',
      title: 'Copy failed',
      description:
        'The request or the clipboard write failed. The toast says "The transcript didn\'t copy. Try again." with the error mark, so Cal opens the menu again and chooses the same item. Untitled stays the shown tab.',
      rationale:
        'The words follow Copy link, which says "The link didn\'t copy. Try again." One toast covers a failed request and a refused write, because the next step is the same: a press on the item again. A design call of 9 November 2026 keeps the text of a refused write for one minute, so the next press of the same item writes it at once.',
      props: { copyTranscript: 'failed' },
    },
    {
      slug: 'archived',
      title: 'Archived workspace',
      description:
        'Checkout address autocomplete is archived, so its chat is read-only. A right click on the Address autocomplete tab opens its menu with only Copy link, Copy concise transcript, and Copy full transcript. Rename session, Move left, and Move right change the workspace, so the menu leaves them out. A file or diff tab of a read-only workspace, such as a workspace of a suspended org, opens no menu. On a phone, a long press on the tab opens the three items as a sheet, and no drag starts.',
      rationale:
        'The user chose option B of decision 214 on 9 November 2026: a copy changes nothing, and an archived workspace holds finished work that a member is likely to keep. The menu leaves out each item that a read-only workspace does not allow, so it shows no greyed rows that never turn on. An item that the place of a tab rules out, such as Move left on the first tab, still keeps its place, greyed. A design call of the same day marks each item that changes the workspace, so a later item that only reads needs no new decision.',
      props: {
        tab: 'session',
        sandbox: 'archived',
        conversation: 'history',
        banner: 'merged',
        overlay: 'tab-menu',
        copyTranscript: 'none',
      },
    },
  ],
})
