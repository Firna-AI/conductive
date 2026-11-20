import { defineScreen } from '@mokly/mokly'
import { OneListWorkspaceScreen } from '../../../../../screens/issues/OneListScreens'

export const issuesOneListWorkspace = defineScreen({
  title: 'B. The issue becomes the workspace',
  description:
    'After Start, the row of the issue is the row of its workspace, with its live mark, in the same section. The workspace keeps the issue as its first tab, I-31 Issue, before its sessions. The session runs with the issue as its first message.',
  rationale:
    'The issue and its workspace are one thing, so the list shows one row for them. The issue tab keeps the brief in view, as a file tab keeps a file.',
  relatedDocs: [],
  props: {},
  useCasePaths: ['user-flows/issue-one-list'],
  render: (_props, context) => (
    <OneListWorkspaceScreen viewport={context.viewport} tab="session" />
  ),
})
