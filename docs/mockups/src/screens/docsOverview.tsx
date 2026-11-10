import { productName } from '../brand'
import type {
  DocsPage,
  DocsSection,
} from '../components/marketing/docs/docsPage'

/** The headings of the overview, which its contents link to. */
const sections = {
  how: { id: 'how-it-works', title: 'How it works' },
  workspace: { id: 'what-a-workspace-has', title: 'What a workspace has' },
  words: { id: 'words-in-these-guides', title: 'Words in these guides' },
  find: { id: 'find-a-guide', title: 'Find a guide' },
} as const satisfies Record<string, DocsSection>

/** The body of the overview: example words of the docs, not their final text. */
function OverviewBody() {
  return (
    <>
      <h2 id={sections.how.id}>{sections.how.title}</h2>
      <p>
        Each task is a workspace. A workspace has its own branch and its own
        cloud computer, with a full clone of your repository. Agents work there
        while you follow along.
      </p>
      <ol>
        <li>You describe the task in a new workspace.</li>
        <li>
          An agent works on the branch, in the cloud computer of the workspace.
        </li>
        <li>
          You follow the chat, read the changes, and open the app in a preview.
        </li>
        <li>
          You create the pull request from the workspace, and merge it when its
          checks pass.
        </li>
      </ol>
      <h2 id={sections.workspace.id}>{sections.workspace.title}</h2>
      <ul>
        <li>
          <strong>Sessions</strong>: chats with agents powered by Claude or
          Codex. A workspace can have several.
        </li>
        <li>
          <strong>Files and changes</strong>: every file of the branch, and what
          the agents changed.
        </li>
        <li>
          <strong>Terminal and previews</strong>: a shell on the cloud computer,
          and the pages that its ports serve.
        </li>
        <li>
          <strong>Pull request bar</strong>: the pull request of the branch,
          with its checks.
        </li>
      </ul>
      <h2 id={sections.words.id}>{sections.words.title}</h2>
      <table>
        <thead>
          <tr>
            <th scope="col">Word</th>
            <th scope="col">Meaning</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Org</td>
            <td>
              A team. It holds the workspaces, the repositories that they use,
              and their cloud computer.
            </td>
          </tr>
          <tr>
            <td>Workspace</td>
            <td>One task, with its own branch and its own cloud computer.</td>
          </tr>
          <tr>
            <td>Session</td>
            <td>One chat with an agent, in a workspace.</td>
          </tr>
          <tr>
            <td>Cloud computer</td>
            <td>
              The computer where the agents, the terminal, and the previews of a
              workspace run.
            </td>
          </tr>
        </tbody>
      </table>
      <h2 id={sections.find.id}>{sections.find.title}</h2>
      <p>
        New here? Read Get started first. The menu lists every guide, in three
        groups:
      </p>
      <ul>
        <li>
          <strong>Start</strong>: sign up, and connect your agents.
        </li>
        <li>
          <strong>Work</strong>: workspaces, sessions, files, previews, and pull
          requests.
        </li>
        <li>
          <strong>Manage</strong>: the cloud computer of an org, its members,
          the Mac app, and security.
        </li>
      </ul>
    </>
  )
}

/** The overview of the docs, at `/docs`. */
export const docsOverviewPage: DocsPage = {
  guide: 'overview',
  lead: `${productName} gives each coding task its own branch and its own cloud computer. Agents powered by Claude and Codex do the work, and you review it from any browser.`,
  sections: Object.values(sections),
  body: <OverviewBody />,
}
