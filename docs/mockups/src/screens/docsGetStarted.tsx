import { ScreenLink } from '../components/common/ScreenLink'
import type {
  DocsPage,
  DocsSection,
} from '../components/marketing/docs/docsPage'
import code from '../components/marketing/docs/DocsProse.module.css'
import { paths } from '../paths'

/** The headings of the guide, which its contents link to. */
const sections = {
  before: { id: 'before-you-start', title: 'Before you start' },
  signIn: { id: 'sign-in', title: 'Sign in' },
  access: { id: 'get-access', title: 'Get access' },
  steps: { id: 'finish-the-three-steps', title: 'Finish the three steps' },
  agent: { id: 'connect-an-agent', title: 'Connect an agent' },
  computer: {
    id: 'wait-for-the-cloud-computer',
    title: 'Wait for the cloud computer',
  },
  tools: { id: 'add-your-tools', title: 'Add your tools' },
  task: { id: 'send-the-first-task', title: 'Send the first task' },
} as const satisfies Record<string, DocsSection>

/**
 * An install script of the org's cloud computer, as the Cloud computer tab
 * of the org settings shows it. Its long lines scroll on a phone.
 */
function InstallScript() {
  const and = <span className={code.operator}>{'&&'}</span>
  return (
    <pre aria-label="Example install script" role="region" tabIndex={0}>
      <code>
        <span className={code.comment}>#!/usr/bin/env bash</span>
        {'\n'}
        <span className={code.function}>set</span> -euo pipefail
        {'\n\n'}
        <span className={code.comment}># Tools for every workspace</span>
        {'\n'}
        <span className={code.function}>sudo</span> apt-get install -y
        postgresql-client-16 redis-server
        {'\n'}
        <span className={code.function}>cd</span> ~/code/storefront {and}{' '}
        <span className={code.function}>npm</span> ci {and}{' '}
        <span className={code.function}>npx</span> prisma generate
      </code>
    </pre>
  )
}

/** The body of Get started: example words of the docs, not their final text. */
function GetStartedBody() {
  return (
    <>
      <h2 id={sections.before.id}>{sections.before.title}</h2>
      <ul>
        <li>A GitHub account. It is also your sign-in.</li>
        <li>Repositories on GitHub that the agents can work on.</li>
        <li>
          A Claude subscription, an Anthropic API key, or an OpenAI API key.
        </li>
      </ul>
      <h2 id={sections.signIn.id}>{sections.signIn.title}</h2>
      <p>
        Choose Continue with GitHub on the sign-in page. Each sign-in accepts
        the Terms of use. Your first sign-in also creates your account.
      </p>
      <ul>
        <li>
          <ScreenLink className={code.guideAction} to={paths.signIn}>
            Open the sign-in page
          </ScreenLink>
        </li>
        <li>
          <ScreenLink className={code.guideAction} to={paths.terms}>
            Read the Terms of use
          </ScreenLink>
        </li>
      </ul>
      <h2 id={sections.access.id}>{sections.access.title}</h2>
      <p>
        A new account starts on the waitlist. Until you have access, the app
        shows only the waitlist screen. One of these gives you access:
      </p>
      <ul>
        <li>
          <strong>Invite code</strong>: type it on the waitlist screen, then
          choose Use code. An invite link comes with its code, so you do not
          type it.
        </li>
        <li>
          <strong>Org invitation</strong>: an org admin invites an email address
          that is verified on your GitHub account. Choose Accept invitation on
          the waitlist screen.
        </li>
        <li>
          <strong>Approval</strong>: otherwise, you wait for an approval. If a
          primary verified email is available, the notice goes there.
        </li>
      </ul>
      <p>
        After an invite code or an approval, Get started opens with three steps.
        An accepted invitation opens its org instead.
      </p>
      <h2 id={sections.steps.id}>{sections.steps.title}</h2>
      <ol>
        <li>
          <strong>Install the GitHub App</strong> on the GitHub account that
          owns your repositories. You choose the repositories that it can reach.
        </li>
        <li>
          <strong>Create an org</strong> with at least one repository. An org
          holds your workspaces, the repositories that they use, and their cloud
          computer.
        </li>
        <li>
          <strong>Connect Claude or Codex.</strong> Your agents run on your own
          Claude or OpenAI account.
        </li>
      </ol>
      <p>
        Create org also starts the first build of the org&apos;s cloud computer.
        You can connect an agent while it runs.
      </p>
      <h2 id={sections.agent.id}>{sections.agent.title}</h2>
      <table>
        <thead>
          <tr>
            <th scope="col">Agent</th>
            <th scope="col">Login</th>
            <th scope="col">Where you get it</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Claude</td>
            <td>Subscription token</td>
            <td>
              Run <code>claude setup-token</code> on your computer
            </td>
          </tr>
          <tr>
            <td>Claude</td>
            <td>API key</td>
            <td>Your Anthropic account</td>
          </tr>
          <tr>
            <td>Codex</td>
            <td>OpenAI API key</td>
            <td>Your OpenAI account</td>
          </tr>
        </tbody>
      </table>
      <p>
        For a subscription token, run this command on your computer, then paste
        the token that it prints:
      </p>
      <pre>
        <code>
          <span className={code.function}>claude</span> setup-token
        </code>
      </pre>
      <p>You can connect the other agent at any time in your account.</p>
      <h2 id={sections.computer.id}>{sections.computer.title}</h2>
      <p>
        The org step shows the build while it runs. A build runs for at most 60
        minutes.
      </p>
      <ul>
        <li>
          <strong>Ready</strong>: the org is ready for a new workspace.
        </li>
        <li>
          <strong>Failed</strong>: choose Try again, or open the log to see what
          failed.
        </li>
      </ul>
      <h2 id={sections.tools.id}>{sections.tools.title}</h2>
      <p>
        Every workspace starts from the cloud computer of its org. To install
        more software, an admin adds an install script in the Cloud computer
        settings of the org, then builds the computer. The script runs only at a
        build:
      </p>
      <InstallScript />
      <h2 id={sections.task.id}>{sections.task.title}</h2>
      <p>
        Open the org and choose New workspace. Choose a repository, describe the
        task, and send it. The workspace gets its own branch and cloud computer,
        and the agent starts work.
      </p>
    </>
  )
}

/** The Get started guide, at `/docs/get-started`. */
export const docsGetStartedPage: DocsPage = {
  guide: 'get-started',
  lead: 'Sign in with GitHub and get access. Then create an org, connect an agent, and give the agent its first task.',
  sections: Object.values(sections),
  body: <GetStartedBody />,
}
