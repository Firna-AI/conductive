import { productName } from '../../docs/mockups/src/brand'
import {
  legalAddress,
  legalOperator,
  legalTitles,
  list,
  mailLink,
  paragraph,
  text,
  type LegalDocument,
} from './legal-text'
import { privacyUsesSection } from './privacy-uses'

/**
 * The privacy notice follows the list of privacy information in the ICO
 * guidance that the README names. The facts come from the architecture
 * and the protocol docs. Both legal pages share the operator details and
 * contact address. The section on what the product uses, and why, is in
 * `privacy-uses.ts`. Its Keys and logins item defines the newer and older
 * cloud computers that the section on who gets the data uses.
 */
export const privacyDocument: LegalDocument = {
  title: legalTitles.privacy,
  description: `The privacy notice of ${productName}.`,
  lead: text`This notice says which personal data ${productName} uses, why
  it uses it, and who gets it. Effective date: 11 November 2026.`,
  sections: [
    {
      title: 'Who is responsible',
      blocks: [
        paragraph`${legalOperator.name} is the data controller for the
          personal data described in this notice. It decides how
          ${productName} uses that data.`,
        paragraph`${legalOperator.name} is registered in
          ${legalOperator.registration}. Company number:
          ${legalOperator.companyNumber}.`,
        paragraph`Registered office: ${legalOperator.registeredOffice}.
          VAT number: ${legalOperator.vatNumber}.`,
        paragraph`For privacy questions, contact ${mailLink(legalAddress)}.`,
      ],
    },
    privacyUsesSection,
    {
      title: 'Who gets your data',
      blocks: [
        list(
          text`Cloudflare runs ${productName} and stores its data.
            If a workspace has no name, Cloudflare's AI model service can
            write a short name from the text of its first message.
            For that request, ${productName} replaces each path mention of a file
            attached to that message with the file's original name. The model
            requests of the agents in a newer cloud computer, and their
            answers, pass through ${productName} on Cloudflare. Agent settings
            in the repository can send these requests to another address
            instead.`,
          text`GitHub signs you in, and gives ${productName} access to your
            repositories through its GitHub App. Each commit made in a cloud
            computer carries its author's GitHub display name or login and
            GitHub no-reply address. That address contains the author's GitHub
            user ID and login. GitHub and each reader of the repository see
            that name and address. The Mac app also checks
            GitHub for updates and downloads new versions. These requests
            send your network address to GitHub.`,
          text`Resend sends the org invitations, approval emails, and feedback
            emails of ${productName}. An invitation gives it the invited email
            address, org name, inviter's name, and invitation link. An approval
            gives it your primary verified email and the email text. For
            feedback, it gets your message, screenshots, context, and reply
            address, and sends them to the team inbox.`,
          text`The email provider of the operator hosts the team inbox and
            receives your feedback message, screenshots, context, and reply
            address. The team reads them there.`,
          text`A cloud computer provider runs the cloud computers of every org
            for ${productName}, in the account of ${productName}. Your code,
            your files, and your agent sessions are in them. ${productName}
            sends the provider the requests that start, stop, and use them.`,
          text`Anthropic and OpenAI get your messages, your files, and your
            code when an agent works on them. Each Mac command request and its
            result also go to the agent and to Anthropic or OpenAI.
            With each message, they also get
            the GitHub login and the display name of its sender. They also get
            the name of the workspace branch, which starts with the GitHub
            login of the first owner of the workspace. From a newer cloud
            computer, the agents send them through ${productName}, which adds
            the agent login. With the older software in an older cloud
            computer, the agents send them directly, with the agent login. In
            both kinds of cloud computer, agent settings in the repository can
            send them to another address instead. Each session uses the
            login of the member who started it. Each run of a routine sends
            its prompt on the login of the member who owns the routine.
            Your messages in another
            member's session use that member's login only when that member
            lets other members use it. When that member does not share the
            login, your message starts a new session on your own login. The
            terms of that provider apply.`,
          text`The members of your orgs see the workspaces of the org,
            their chats, and each Mac command request and result. They also see
            the routines of the org, with their prompts and their runs.
            A member with a terminal in a cloud computer can read
            the GitHub token of a turn that runs there. Outside an agent turn,
            the GitHub CLI uses the workspace owner's account. Each member with
            a terminal can get that owner's GitHub token without a running
            turn.`,
          text`In a newer cloud computer, a member with a terminal or a program
            in it can read the credential of a turn that runs there. Through
            ${productName}, that credential can use the login of the member who
            started the session. It works while the turn runs, also from
            outside the cloud computer. A program that keeps running, such as a
            dev server or a program that the startup script starts, can also
            get the credentials of later turns. This includes the turns of
            sessions that other members start. Agent settings in the repository
            can make the agent send its model requests, with their content and
            the credential of the turn, to another address. A commit, the agent,
            or other code can change those settings. The setting that lets other
            members use a login does not change this. After Stop, a credential
            can start no new request. A request that still runs ends within 30
            seconds after the turn ends. If the member who started the session
            removes or changes the login, or loses access to the org, the turn
            ends at its next model request.`,
          text`In an older cloud computer, a member with a terminal or a program
            in it can read the agent login of a turn that runs there. A program
            that a tool of the agent starts, such as a dev server, can keep the
            agent login after the turn ends. A member with a terminal can read
            it there too. Agent settings in the repository can make the agent
            send that login to another address. A commit, the agent, or other
            code can change those settings. The setting that lets other members
            use a login does not change this.`,
          text`The run of your routine for a pull request reads the comments,
            reviews, and descriptions of other GitHub accounts. Such text can
            steer the agent while the run uses your agent login and GitHub
            token, and the env vars of the org.`,
          text`The members of your orgs also see who started each session,
            whose login it uses, and whether it can use that login. They also
            see whether its starter lets other members use that login.`,
          text`If the operator suspends your account, the members of your orgs
            learn that it is suspended. A workspace that you own then says
            that its owner is suspended, until an operator lifts the
            suspension.`,
        ),
      ],
    },
    {
      title: 'Transfers to other countries',
      blocks: [
        paragraph`The providers above can process your data in countries
          other than the country where you live, including the United
          States. Their data protection laws can differ from yours.`,
        list(
          text`Cloudflare's standard data processing terms use its
            certification under the UK Extension to the EU-US Data Privacy
            Framework for covered transfers. For other restricted UK
            transfers, those terms apply the European Commission's standard
            contractual clauses with the UK International Data Transfer
            Addendum. These contract terms protect personal data sent abroad.`,
          text`GitHub processes data in several countries, including the
            United States. Its published privacy statement describes its
            certification under the UK Extension and its use of standard
            contractual clauses. UK regulations approve transfers covered
            by the UK Extension certification.`,
          text`Resend processes email data in the United States. Its data
            processing terms apply the European Commission's standard
            contractual clauses with the UK International Data Transfer
            Addendum to restricted UK transfers.`,
          text`The cloud computer provider is based in the United States.
            It reports that its cloud computers and saved snapshots run in
            Germany, Finland, and France. UK adequacy regulations approve
            transfers to countries in the European Economic Area. Other
            provider operations can involve processing outside that area.`,
          text`Anthropic and OpenAI process agent requests under the
            agreement for the connected account that the session uses.
            Their published privacy and data processing terms describe
            adequacy approvals, standard contractual clauses, and the UK
            Addendum where they apply.`,
        ),
        paragraph`For copies of the published safeguards named above,
          contact ${mailLink(legalAddress)}.`,
      ],
    },
    {
      title: `How long ${productName} keeps data`,
      blocks: [
        paragraph`When an admin deletes an org, ${productName} deletes the data
          of the org after 7 days, unless an admin restores it.`,
        paragraph`When the owner or an admin archives a workspace,
          ${productName} stops its cloud computer and keeps it for 14 days.
          Its disk keeps your code, your files, your agent sessions, and each
          secret value that a script or an agent wrote there. ${productName}
          then deletes the cloud computer, unless a member restores the
          workspace before then.`,
        paragraph`${productName} keeps each file that you send with a message
          until it deletes the workspace of the message. It deletes an unsent
          file 7 days after you upload it.`,
        paragraph`An account that waits for app access stays until you ask
          for its deletion, as every other account does.`,
        paragraph`Account records, the latest Terms acceptance, and
          suspension records do not automatically expire when you stop
          using ${productName}. Workspace chat history and Mac command records
          stay while their org exists, including while a cloud computer is
          stopped. When ${productName} passes on model requests and their
          answers, it keeps no copy of them.`,
        paragraph`A connected agent login stays until you remove or replace
          it. Panel widths stay in your browser until you clear its saved
          data. The providers above can keep their own records under their
          terms and privacy notices.`,
        paragraph`The team keeps each feedback email in its inbox while it
          helps to improve ${productName}. It deletes the email when it no
          longer helps, or when the sender asks. ${productName} keeps no copy
          of feedback in its own storage. The app keeps an unsent feedback
          draft only in the memory of its open tab.`,
        paragraph`To request deletion of your personal data, write to
          ${mailLink(legalAddress)}. Deletion rights depend on applicable
          law and can have exceptions.`,
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
          text`The settings never return a stored env var value or agent login
            to your browser.`,
          text`An env var is secret until an admin clears its mark. Before
            ${productName} puts agent output in the chat history or on a
            screen, it hides each exact copy of a secret value in it. It also
            hides such a copy in each start log that it shows, and in the
            names and folders of the servers that it lists. It does not hide
            a changed or encoded value. A change of the mark applies at
            the next start of a cloud computer.`,
          text`${productName} keeps the real path of each file, because it
            needs that path to open the file. It also keeps the real name of
            the default branch of each repository, and of the base branch of
            each workspace. Screens hide each exact copy
            of a secret value in these paths and names. Your browser still gets
            the real values, so a secret value can show in the data that your
            browser gets and sends (decision 145).`,
          text`Agent output, start logs, and the lists of servers can show
            the value of an env var that is not secret. Each member who reads
            them then sees that value. The agents and each member with a terminal can read every
            env var value in the cloud computers. Secret values can also stay
            on the disk of a cloud computer, for example in its agent sessions
            and its agent output.`,
        ),
      ],
    },
    {
      title: 'Cookies',
      blocks: [
        paragraph`This site sets no cookies. The web app and the Mac app each
          set their own cookie that keeps you signed in. Only the Mac app's
          cookie store holds its session cookie. Another cookie protects the
          GitHub sign-in while it runs. When the web app sends you to GitHub
          to install the GitHub App or change its access, a third cookie
          keeps the screen that you left, so that the app can return you
          there.`,
        paragraph`Each sign-in cookie lasts for up to 7 days. The GitHub
          sign-in protection cookie lasts for up to 10 minutes. The GitHub
          return cookie lasts for up to 1 hour, and the app deletes it when
          you come back. These cookies support sign-in, security, and the
          return from GitHub. They use secure connections and cannot be read
          by page scripts.`,
      ],
    },
    {
      title: 'Your rights',
      blocks: [
        paragraph`Depending on where you live, the law can give you rights
          over your personal data. You can ask for a copy of it, and ask to
          correct it, to delete it, to limit its use, or to object to its
          use. You can also ask to take it to another service.`,
        paragraph`To exercise these rights, write to
          ${mailLink(legalAddress)}. Describe your request and the account
          or org it concerns. The operator may need information to verify
          your identity before acting on the request.`,
      ],
    },
    {
      title: 'Complaints',
      blocks: [
        paragraph`You can complain to the data protection authority that
          has jurisdiction over your complaint. You can also raise a
          privacy concern with the operator at ${mailLink(legalAddress)}.`,
        paragraph`In the UK, you can contact the Information Commissioner's
          Office at ico.org.uk/make-a-complaint/ or on 0303 123 1113.`,
      ],
    },
    {
      title: 'Changes to this notice',
      blocks: [
        paragraph`The operator publishes changes on this page and updates
          its effective date. Check this page for the current notice. Any
          additional notice required by applicable law still applies.`,
      ],
    },
  ],
}
