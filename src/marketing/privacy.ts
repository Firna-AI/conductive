import { productName } from '../../docs/mockups/src/brand'
import {
  draft,
  legalTitles,
  list,
  paragraph,
  text,
  type LegalDocument,
} from './legal-text'

/**
 * The privacy notice, as a draft for a lawyer, as decision 35 asks. It
 * follows the list of privacy information in the ICO guidance that the
 * README names. The facts come from the architecture and the protocol
 * docs. Each fact that the operator or the lawyer must supply is a draft
 * field.
 */
export const privacyDocument: LegalDocument = {
  title: legalTitles.privacy,
  description: `The privacy notice of ${productName}, as a draft for lawyer review.`,
  lead: text`This notice says which personal data ${productName} uses, why
  it uses it, and who gets it. Effective date:
  ${draft('To confirm: the date when this notice starts')}.`,
  sections: [
    {
      title: 'Who is responsible',
      blocks: [
        paragraph`${draft('To confirm: the legal name and the address of the operator')}
          decides how ${productName} uses your personal data.`,
        paragraph`Contact for privacy questions:
          ${draft('To confirm: the contact address')}.`,
        paragraph`${draft('To confirm: whether the law asks for a data protection officer or a representative')}`,
      ],
    },
    {
      title: `What ${productName} uses, and why`,
      blocks: [
        list(
          text`Your GitHub account: your GitHub user ID, login, display name,
            and avatar. They sign you in, and they show who owns and who
            sends each piece of work.`,
          text`Your agreement: you accept the current version of the terms at
            each sign-in. ${productName} keeps the latest version that you
            accepted, and the time when you first accepted it. They show that
            you accepted the terms.`,
          text`A suspension: the time when the operator suspended your
            account, if that happens. It keeps your cloud computers stopped.`,
          text`Your session: a cookie of the app keeps you signed in. A
            second cookie protects the GitHub sign-in while it runs.`,
          text`Your orgs: the orgs, members, roles, invites, sections,
            repositories, workspaces, scripts, and settings that you and your
            team make. They run the service.`,
          text`Keys and logins: the env var values of each org, and your
            Claude or OpenAI logins. ${productName} stores them encrypted. It
            uses your login only for the turns of the sessions that you start,
            also for the messages of other members.`,
          text`Your work: ${productName} keeps your messages and the answers
            of the agents as the chat history of each workspace. It also
            keeps the last file list and the last summary of changes of each
            workspace. The files that you attach go to the cloud computer of
            the workspace.`,
          text`Your code: it stays in the cloud computers that ${productName}
            runs for your org. ${productName} reads a file or a diff when you
            open it, to show it to you.`,
          text`GitHub events: the state of the pull requests and the checks
            of your branches, which GitHub sends to ${productName}.`,
          text`Panel widths: your browser keeps the widths of the panels of
            the app. They stay in your browser.`,
        ),
        paragraph`${draft('To confirm: the lawful basis for each use')}`,
      ],
    },
    {
      title: 'Who gets your data',
      blocks: [
        list(
          text`Cloudflare runs ${productName} and stores its data.`,
          text`GitHub signs you in, and gives ${productName} access to your
            repositories through its GitHub App.`,
          text`A cloud computer provider runs the cloud computers of every org
            for ${productName}, in the account of ${productName}. Your code,
            your files, and your agent sessions are in them. ${productName}
            sends the provider the requests that start, stop, and use them.`,
          text`Anthropic and OpenAI get your messages, your files, and your
            code when an agent works on them. Each session uses the login of
            the member who started it, also for your messages. The terms of
            that provider apply.`,
          text`The members of your orgs see the workspaces of the org and
            their chats. A member with a terminal in a cloud computer can read
            the agent login and the GitHub token of a turn that runs there. A
            program that a tool of the agent starts, such as a dev server, can
            keep the agent login after the turn ends. A member with a terminal
            can read it there too.`,
          text`The members of your orgs also see who started each session,
            whose login it uses, and whether it can use that login.`,
          text`If the operator suspends your account, the members of your orgs
            learn that it is suspended. A workspace that you own then says
            that its owner is suspended.`,
        ),
        paragraph`${draft('To confirm: the contracts with these providers, and any other recipient')}`,
      ],
    },
    {
      title: 'Transfers to other countries',
      blocks: [
        paragraph`${draft('To confirm: where the data is stored and used, and the safeguards for each transfer to another country')}`,
      ],
    },
    {
      title: `How long ${productName} keeps data`,
      blocks: [
        paragraph`When an admin deletes an org, ${productName} deletes the data
          of the org after 7 days, unless an admin restores it.`,
        paragraph`${draft('To confirm: how long each kind of data stays, also after you stop using the service')}`,
      ],
    },
    {
      title: 'Security',
      blocks: [
        list(
          text`${productName} stores each env var value and agent login
            encrypted.`,
          text`It does not send the key of its cloud computer provider to
            your browser or into a cloud computer.`,
          text`Your browser does not get a stored secret back, such as an agent
            login or the value of any env var.`,
          text`An env var is secret until an admin clears its mark.
            ${productName} hides each exact copy of a secret value in agent
            output and in the start logs of the cloud computers. It does not
            hide a changed or encoded value. A change of the mark applies at
            the next start of a cloud computer.`,
          text`Agent output and start logs can show the value of an env var
            that is not secret. Each member who reads them then sees that
            value. The agents and each member with a terminal can read every
            env var value in the cloud computers.`,
        ),
      ],
    },
    {
      title: 'Cookies',
      blocks: [
        paragraph`This site sets no cookies. The app sets one cookie that
          keeps you signed in, and one that protects the GitHub sign-in while
          it runs.`,
        paragraph`${draft('To confirm: the cookie notice that the law asks for')}`,
      ],
    },
    {
      title: 'Your rights',
      blocks: [
        paragraph`Depending on where you live, the law can give you rights
          over your personal data. You can ask for a copy of it, and ask to
          correct it, to delete it, to limit its use, or to object to its
          use. You can also ask to take it to another service.`,
        paragraph`${draft('To confirm: the law that applies, and how to use each right')}`,
      ],
    },
    {
      title: 'Complaints',
      blocks: [
        paragraph`You can complain to a data protection authority.
          ${draft('To confirm: the authority and its contact details')}`,
      ],
    },
    {
      title: 'Changes to this notice',
      blocks: [
        paragraph`${draft('To write: how the operator tells you about a change')}`,
      ],
    },
  ],
}
