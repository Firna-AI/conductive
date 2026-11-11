import { defineScreen } from '@mokly/mokly'
import {
  WorkspaceListScreen,
  workspaceListSchema,
} from '../../../screens/WorkspaceListScreen'

export const appShell = defineScreen({
  title: 'App shell',
  description:
    'The workspace list of an org, in the sections that the user made. On mobile it is the home screen, under an org switcher. On desktop it is the sidebar beside the org rail, and the main area waits for a choice. The mark of each workspace shows the checks or the merge of its pull request in one colour. The amber mark of Fix flaky cart test moves, because its agent works.',
  rationale:
    'Each row is one line: a small dot-matrix mark, the name, and the time since the last activity. The user chose on 10 November 2026 that the mark shows the GitHub state of the pull request in one colour (list mark decision 1): red when checks failed, amber while checks run, green when checks passed, and purple after the merge. A failed check wins over a check that runs, and the merge wins over the checks. A conflict, requested changes, a draft, and a block do not change the colour. A branch without a pull request, a pull request without checks, and a pull request closed without a merge show a dim grey mark. Motion shows the agent: a light runs around the ring while it works, and the whole mark pulses while it needs input. Every other mark is still. With reduced motion, the ring or the middle column stays lit. An archived workspace keeps a faint mark without colour. Bold text alone marks unread output. Screen readers hear the GitHub state before the state of the workspace. One shape for each state of the agent and the cloud computer was rejected, because the list and the pull request bar disagreed. The header keeps that shape, for the state of the cloud computer. Sections are groups that the user makes, not repositories, so one section can hold workspaces of several repositories. Opening a stopped workspace resumes its sandbox.',
  relatedDocs: [],
  propSchema: workspaceListSchema,
  props: { list: 'workspaces', menu: 'none', palette: 'closed' },
  useCasePaths: [
    'user-flows/create-workspace',
    'user-flows/reopen-stopped-workspace',
    'user-flows/open-workspace-from-palette',
    'user-flows/archive-from-list',
    'user-flows/create-org',
  ],
  render: (props, context) => (
    <WorkspaceListScreen state={props} viewport={context.viewport} />
  ),
})
