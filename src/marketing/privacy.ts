import { productName } from '../shared/brand'
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
import { privacyRecipientsSection } from './privacy-recipients'
import { privacySkillsSection } from './privacy-skills'
import { privacyUsesSection } from './privacy-uses'

/**
 * The privacy notice follows the list of privacy information in the ICO
 * guidance that the README names. The facts come from the architecture
 * and the protocol docs. Both legal pages share the operator details and
 * contact address. The section on what the product uses, and why, is in
 * `privacy-uses.ts`. The recipients of that data are in
 * `privacy-recipients.ts`.
 */
export const privacyDocument: LegalDocument = {
  title: legalTitles.privacy,
  description: `The privacy notice of ${productName}.`,
  lead: text`This notice says which personal data ${productName} uses, why
  it uses it, and who gets it. Effective date: 26 November 2026.`,
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
    privacyRecipientsSection,
    privacySkillsSection,
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
          text`The cloud computer providers are companies registered in the
            United States. ${productName} uses their European Union regions
            for cloud computers and saved snapshots. These locations include
            Germany, Finland, and France. UK adequacy regulations
            approve transfers to countries in the European Economic Area.
            Other provider operations can involve processing outside that
            area.`,
          text`For a Claude subscription, ChatGPT plan, or provider API key, Anthropic or OpenAI processes agent requests under
            the agreement for the connected account that the session uses.
            Their published privacy and data processing terms describe
            adequacy approvals, standard contractual clauses, and the UK
            Addendum where they apply.`,
          text`For an own endpoint login, the chosen endpoint processes
            agent requests where its owner runs it. Its terms and privacy
            notice govern that processing.`,
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
          workspace before then. At the end of the 14 days, the workspace
          leaves the Archived group and the command palette.`,
        paragraph`Service definitions and raw logs use memory in the running
          cloud computer. Retained logs hold at most 10 MiB in total per
          service. A computer stop discards these definitions, logs, and
          the current service list. They do not enter saved disks and do
          not restore themselves after a resume. A program can still write
          copied output or secrets to its own files.`,
        paragraph`Removing a workspace from the list keeps its chat history
          until the org is deleted. A direct link or a chat link still opens
          its read-only chat.`,
        paragraph`${productName} keeps each attached file until the cloud
          computer of its workspace has it and its first start succeeds.
          It then deletes its own copy. The file stays in the cloud computer.
          The message keeps the file's name, type, size, and path.
          ${productName} deletes an unsent file 7 days after you upload it.
          A large text that you paste into a message becomes such a file,
          and it uploads before you send it.`,
        paragraph`An account that waits for app access stays until you ask
          for its deletion, as every other account does.`,
        paragraph`Account records, the latest Terms acceptance, the time of
          your last activity, and suspension records do not automatically expire when you stop
          using ${productName}. Workspace chat history, Mac command records,
          secret request records, and merge records stay while their org
          exists, including
          while a cloud computer is stopped or a workspace is removed. When
          ${productName} passes on model requests and their answers, it keeps
          no copy of them. ${productName} deletes each record of the steps of
          a build or a start after 90 days.`,
        paragraph`A secret in the Secrets settings of an org stays until a
          member who may delete it deletes it. A value that a member gives
          an agent for 15 minutes stays for 15 minutes. A value for a
          workspace stays until the workspace is archived.`,
        paragraph`${productName} keeps each reveal record while its org
          exists, also after the secret is deleted. Each record keeps the
          secret ID and name, the admin, and the time. The records go when
          ${productName} deletes the org.`,
        paragraph`A personal agent login stays until you remove or replace
          it. An org login stays until an admin removes or replaces it, or
          the org is deleted. It stays when the admin who connected it
          leaves. Panel sizes and the last workspace of each org stay in
          your browser until you clear its saved data. The providers above
          can keep their own records under their
          terms and privacy notices.`,
        paragraph`For a pending merge queue stack cleanup, ${productName}
          keeps the workspace and the member whose action caused the entry
          to leave. It uses this record to choose an account for cleanup
          retries. It clears the record when the stack is gone.`,
        paragraph`The team keeps each feedback email in its inbox while it
          helps to improve ${productName}. It deletes the email when it no
          longer helps, or when the sender asks. ${productName} keeps no copy
          of your feedback message or screenshots in its own storage. The
          app keeps an unsent feedback draft only in the memory of its open
          tab.`,
        paragraph`Feedback send records normally stay for about 24 hours.
          A late retry whose delivery remains unconfirmed can extend this
          to about 25 hours. Scheduled cleanup removes them after these
          periods. Cleanup delays can keep them longer. Account deletion
          also deletes these records.`,
        paragraph`To request deletion of your personal data, write to
          ${mailLink(legalAddress)}. Deletion rights depend on applicable
          law and can have exceptions.`,
      ],
    },
    {
      title: 'Security',
      blocks: [
        list(
          text`${productName} stores each env var value, the value of each
            secret in the Secrets settings, and each personal or org agent
            login encrypted. An own endpoint login includes its address and
            key. Only its host, with any non-default port, stays in plain text.`,
          text`It does not send the keys of its cloud computer providers to
            your browser or into a cloud computer.`,
          text`The settings never return a stored env var value or agent login
            to your browser. For an own endpoint login, your browser gets
            only its host and any non-default port, without the full address
            or key.`,
          text`An admin of an active org can reveal the value of one secret in its
            Secrets settings at a time, also of a secret that another member
            added. ${productName} records each reveal with the admin and the
            time, and every member sees the last reveal of the current
            value. A member who is not an admin never gets a secret value back.`,
          text`An agent can ask to run one command with a secret in the
            Secrets settings. The command gets the value. The agent gets
            the secret's name and environment variable name, without the
            value. ${productName} hides each exact copy of the value in the
            output of the command and in the text of the chat. It does not
            hide a changed or encoded value, or a value in a picture that an
            agent answer shows.`,
          text`An env var is secret until an admin clears its mark. Before
            ${productName} puts the text of agent output in the chat history
            or on a screen, it hides each exact copy of a secret value in it.
            It also hides such a copy in each start log that it shows, in
            the server and service details that it lists, in service logs,
            in the names and descriptions of the skills that it lists, and
            in the text of a skill that you open. It does not
            hide a changed or encoded value, or a value in a picture that an
            agent answer shows. A change of the mark applies at the next start
            of a cloud computer.`,
          text`${productName} keeps the real path of each file, because it
            needs that path to open the file. It also keeps the real name of
            the default branch of each repository, and of the base branch of
            each workspace. Screens hide each exact copy
            of a secret value in these paths and names. Your browser still gets
            the real values, so a secret value can show in the data that your
            browser gets and sends (decision 145).`,
          text`Agent output, start logs, and service logs can show the value
            of an env var that is not secret. The lists of servers, services,
            and skills, and the text of a skill that you open, can show it
            too. Each member who reads them then sees
            that value. The agents and each member with a terminal can read every
            env var value in the cloud computers. Secret values can also stay
            on the disk of a cloud computer, for example in its agent sessions
            and its agent output.`,
          text`While a command runs with a secret from the Secrets settings,
            its value is in the cloud computer. Programs there, and each
            member with a terminal, can read it then. The command can also
            write it to a file on the disk of the cloud computer.`,
          text`A service uses the org environment values installed at this
            computer start, plus values supplied for that service. It does
            not inherit the agent's credentials, turn context, or secrets
            added to an approved command. It runs as the same computer user
            as other programs and can still read available files and
            credentials, including those of later turns.`,
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
