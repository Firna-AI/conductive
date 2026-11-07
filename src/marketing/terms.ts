import {
  appDomain,
  productDomain,
  productName,
} from '../../docs/mockups/src/brand'
import { html } from './html'
import { draftField, type LegalDocument } from './legal'

/**
 * The terms of use, as a draft for a lawyer, as decision 35 asks. The facts
 * come from the architecture and the protocol docs. Each fact that the
 * operator or the lawyer must supply is a draft field.
 */
export const termsDocument: LegalDocument = {
  title: 'Terms of use',
  description: `The terms of use of ${productName}, as a draft for lawyer review.`,
  lead: html`These terms cover your use of ${productName} at ${productDomain}
  and ${appDomain}. Effective date:
  ${draftField('To confirm: the date when these terms start')}.`,
  sections: [
    {
      title: `Who runs ${productName}`,
      body: html`<p>
          ${productName} is run by
          ${draftField('To confirm: the legal name of the operator')},
          ${draftField('To confirm: the registered address')}.
        </p>
        <p>
          Contact:
          ${draftField('To confirm: the contact address for these terms')}.
        </p>`,
    },
    {
      title: 'The service',
      body: html`<p>
          ${productName} is a coding tool in the browser. Each workspace is one
          task with its own branch and its own cloud computer, where agents
          powered by Claude and Codex work.
        </p>
        <p>${productName} is free for now. It has no plans and no billing.</p>`,
    },
    {
      title: 'Your accounts',
      body: html`<ul>
        <li>
          You sign in with GitHub, through the GitHub App of ${productName}. The
          app can reach each repository where you install its GitHub App and
          have access.
        </li>
        <li>
          ${productName} runs the cloud computers of every org in its own
          account with its cloud computer provider. You need no account or key
          of your own for them.
        </li>
        <li>
          The agents run on the Claude or OpenAI login that you connect. The
          model use of each message bills to the account of the member who
          started its session, under the terms of Anthropic or OpenAI.
        </li>
        <li>
          Keep your keys and logins safe.
          ${draftField('To write: your duties for the use of your keys and logins')}
        </li>
      </ul>`,
    },
    {
      title: 'Working in an org',
      body: html`<ul>
        <li>
          Every member of an org sees all of its workspaces, and can send
          messages in each of them.
        </li>
        <li>
          Each session runs on the agent login of the member who started it,
          also for the messages of other members. Each turn's git calls use a
          GitHub token of the member whose message started the turn. Pushes and
          pull requests show as that member.
        </li>
        <li>
          That GitHub token reaches every repository where that person installed
          the GitHub App and has access, not only the repositories of the org.
        </li>
        <li>
          While your login is connected, you cannot stop other members from
          using it in the sessions that you started.
          ${draftField("Do Anthropic's terms let other members use a member's Claude subscription?")}
        </li>
        <li>
          While a turn runs, its agent login is in the cloud computer of the
          workspace. A member with a terminal in that cloud computer can read
          it. Work in an org only with people whom you trust with your logins.
        </li>
        <li>
          Admins manage the members, the repositories, the scripts, and the env
          vars of the org.
        </li>
      </ul>`,
    },
    {
      title: 'Acceptable use',
      body: html`<p>
          Use ${productName} only within the law, and within the terms of
          GitHub, Anthropic, and OpenAI.
        </p>
        <p>
          ${draftField(`To write: the rules of acceptable use of ${productName}, which include the rules of its cloud computer provider`)}
        </p>
        <p>
          ${draftField('To write: how the operator suspends an account, and where to report abuse')}
        </p>`,
    },
    {
      title: 'Your work',
      body: html`<p>
          Your repositories, files, and agent sessions live in the cloud
          computers that ${productName} runs for your org. ${productName} keeps
          the chat history of each workspace, so that you can read it while the
          cloud computer is stopped.
        </p>
        <p>
          ${draftField('To write: the rights in your content, and the permission that the operator needs to run the service')}
        </p>`,
    },
    {
      title: 'Ending your use',
      body: html`<p>
          An admin can delete an org. ${productName} then stops the cloud
          computers of the org at once. It deletes the org after 7 days, unless
          an admin restores it.
        </p>
        <p>
          ${draftField('To write: how you close your account, and what the operator deletes then')}
        </p>`,
    },
    {
      title: 'Availability and liability',
      body: html`<p>
        ${draftField('To write: the availability of the service, its warranties, and the limits of liability')}
      </p>`,
    },
    {
      title: 'Changes to these terms',
      body: html`<p>
        ${draftField('To write: how the operator tells you about a change, and when it takes effect')}
      </p>`,
    },
    {
      title: 'Law and disputes',
      body: html`<p>
        ${draftField('To confirm: the law that governs these terms, and the courts for disputes')}
      </p>`,
    },
  ],
}
