import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  importedWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

const flow = ['user-flows/import-from-conductor']

export const importedOldSession = defineScreen({
  title: 'Old session',
  description:
    'The link Apply coupons before tax opened its Markdown file in a tab, in the Markdown view of the app, before the activation. The file has each message of Cal, each answer of Claude, and one short line for each tool step. The header names the file under Conductor, with its 33 messages, Download, Copy, and the switch between the preview and the source. On a phone the file opens in the Chat tab, with a way back to the chat.',
  rationale:
    'The user chose on 10 November 2026 that each old session is one Markdown file, which opens in the existing Markdown view. The app keeps the file for the life of the workspace, so the link works before the activation and while the cloud computer is stopped, and the chat loads no old event.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...importedWorkspace, tab: 'old-session' },
  useCasePaths: flow,
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'active',
      title: 'After activation',
      description:
        'The activated workspace is ready, and Cal opened the same old session. The file opens beside the tab of the new session, and the header shows Ready.',
      props: { sandbox: 'ready', tab: 'old-session' },
    },
    {
      slug: 'failed',
      title: 'After a failed activation',
      description:
        "The activation failed, and Cal opened the same old session. The file opens beside the tab of the new session. The header shows Couldn't start, the panels say that the workspace couldn't be activated, and the way back of a phone returns to the failed activation.",
      props: { sandbox: 'error', tab: 'old-session' },
    },
    {
      slug: 'stopped',
      title: 'While stopped',
      description:
        'Later, the activated workspace stopped, and Cal opened the same old session. The file opens as before the activation, beside the tab of its new session. The header shows Stopped, and the right column keeps the lists that the workspace saved.',
      props: {
        sandbox: 'stopped',
        tab: 'old-session',
        files: 'changes',
      },
    },
    {
      slug: 'history',
      title: 'In the session history',
      description:
        'The clock at the end of the tabs opens the session history, which lists the old sessions under From Conductor, each with its agent and its day. Each one opens its file, so the old sessions stay one click away after the chat of a new session fills the tab. On a phone the history is a sheet.',
      rationale:
        'The links in place of an empty chat go when a session has messages, so the history keeps them. They are documents, not tabs that the user closed, so they have their own label.',
      props: { sandbox: 'ready', tab: 'new-session', overlay: 'history' },
    },
  ],
})
