import { productName } from '../../docs/mockups/src/brand'
import { html } from './html'
import { draftField, type LegalDocument } from './legal'

/**
 * The privacy notice, as a draft for a lawyer, as decision 35 asks. It
 * follows the list of privacy information in the ICO guidance that the
 * README names. The facts come from the architecture and the protocol
 * docs. Each fact that the operator or the lawyer must supply is a draft
 * field.
 */
export const privacyDocument: LegalDocument = {
  title: 'Privacy notice',
  description: `The privacy notice of ${productName}, as a draft for lawyer review.`,
  lead: html`This notice says which personal data ${productName} uses, why it
  uses it, and who gets it. Effective date:
  ${draftField('To confirm: the date when this notice starts')}.`,
  sections: [
    {
      title: 'Who is responsible',
      body: html`<p>
          ${draftField('To confirm: the legal name and the address of the operator')}
          decides how ${productName} uses your personal data.
        </p>
        <p>
          Contact for privacy questions:
          ${draftField('To confirm: the contact address')}.
        </p>
        <p>
          ${draftField('To confirm: whether the law asks for a data protection officer or a representative')}
        </p>`,
    },
    {
      title: `What ${productName} uses, and why`,
      body: html`<ul>
          <li>
            Your GitHub account: your GitHub user ID, login, display name, and
            avatar. They sign you in, and they show who owns and who sends each
            piece of work.
          </li>
          <li>
            Your session: a cookie of the app keeps you signed in. A second
            cookie protects the GitHub sign-in while it runs.
          </li>
          <li>
            Your orgs: the orgs, members, roles, invites, sections,
            repositories, workspaces, scripts, and settings that you and your
            team make. They run the service.
          </li>
          <li>
            Keys and logins: the env var values of each org, and your Claude or
            OpenAI logins. ${productName} stores them encrypted. It uses your
            login only for the turns that you send.
          </li>
          <li>
            Your work: ${productName} keeps your messages and the answers of the
            agents as the chat history of each workspace. It also keeps the last
            file list and the last summary of changes of each workspace. The
            files that you attach go to the cloud computer of the workspace.
          </li>
          <li>
            Your code: it stays in the cloud computers that ${productName} runs
            for your org. ${productName} reads a file or a diff when you open
            it, to show it to you.
          </li>
          <li>
            GitHub events: the state of the pull requests and the checks of your
            branches, which GitHub sends to ${productName}.
          </li>
          <li>
            Panel widths: your browser keeps the widths of the panels of the
            app. They stay in your browser.
          </li>
        </ul>
        <p>${draftField('To confirm: the lawful basis for each use')}</p>`,
    },
    {
      title: 'Who gets your data',
      body: html`<ul>
          <li>Cloudflare runs ${productName} and stores its data.</li>
          <li>
            GitHub signs you in, and gives ${productName} access to your
            repositories through its GitHub App.
          </li>
          <li>
            A cloud computer provider runs the cloud computers of every org for
            ${productName}, in the account of ${productName}. Your code, your
            files, and your agent sessions are in them. ${productName} sends the
            provider the requests that start, stop, and use them.
          </li>
          <li>
            Anthropic and OpenAI get your messages, your files, and your code
            when an agent works on them, on your own login. The terms of that
            provider apply.
          </li>
          <li>
            The members of your orgs see the workspaces of the org and their
            chats. A member with a terminal in a cloud computer can read the
            agent login of a turn that runs there.
          </li>
        </ul>
        <p>
          ${draftField('To confirm: the contracts with these providers, and any other recipient')}
        </p>`,
    },
    {
      title: 'Transfers to other countries',
      body: html`<p>
        ${draftField('To confirm: where the data is stored and used, and the safeguards for each transfer to another country')}
      </p>`,
    },
    {
      title: `How long ${productName} keeps data`,
      body: html`<p>
          When an admin deletes an org, ${productName} deletes the data of the
          org after 7 days, unless an admin restores it.
        </p>
        <p>
          ${draftField('To confirm: how long each kind of data stays, also after you stop using the service')}
        </p>`,
    },
    {
      title: 'Security',
      body: html`<ul>
        <li>
          ${productName} stores each env var value and agent login encrypted.
        </li>
        <li>
          It does not send the key of its cloud computer provider to your
          browser or into a cloud computer.
        </li>
        <li>Your browser does not get a stored secret back.</li>
      </ul>`,
    },
    {
      title: 'Cookies',
      body: html`<p>
          This site sets no cookies. The app sets one cookie that keeps you
          signed in, and one that protects the GitHub sign-in while it runs.
        </p>
        <p>
          ${draftField('To confirm: the cookie notice that the law asks for')}
        </p>`,
    },
    {
      title: 'Your rights',
      body: html`<p>
          Depending on where you live, the law can give you rights over your
          personal data. You can ask for a copy of it, and ask to correct it, to
          delete it, to limit its use, or to object to its use. You can also ask
          to take it to another service.
        </p>
        <p>
          ${draftField('To confirm: the law that applies, and how to use each right')}
        </p>`,
    },
    {
      title: 'Complaints',
      body: html`<p>
        You can complain to a data protection authority.
        ${draftField('To confirm: the authority and its contact details')}
      </p>`,
    },
    {
      title: 'Changes to this notice',
      body: html`<p>
        ${draftField('To write: how the operator tells you about a change')}
      </p>`,
    },
  ],
}
