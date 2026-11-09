import {
  appDomain,
  productDomain,
  productName,
} from '../../docs/mockups/src/brand'
import {
  abuseAddress,
  draft,
  legalTitles,
  list,
  mailLink,
  paragraph,
  text,
  type LegalDocument,
} from './legal-text'

/**
 * The terms of use, as a draft for a lawyer, as decision 35 asks. The facts
 * come from the architecture and the protocol docs. The rules of acceptable
 * use pass on the rules of the providers of the service, as decision 28
 * asks, and name no provider. Each fact that the operator or the lawyer
 * must supply is a draft field.
 */
export const termsDocument: LegalDocument = {
  title: legalTitles.terms,
  description: `The terms of use of ${productName}, as a draft for lawyer review.`,
  lead: text`These terms cover your use of ${productName} at ${productDomain}
  and ${appDomain}. You accept their current version each time that you
  continue with GitHub to sign in. ${productName} keeps the latest version
  that you accepted, and the time when you first accepted it. Effective
  date: ${draft('To confirm: the date when these terms start')}.`,
  sections: [
    {
      title: `Who runs ${productName}`,
      blocks: [
        paragraph`${productName} is run by
          ${draft('To confirm: the legal name of the operator')},
          ${draft('To confirm: the registered address')}.`,
        paragraph`Contact:
          ${draft('To confirm: the contact address for these terms')}.`,
      ],
    },
    {
      title: 'The service',
      blocks: [
        paragraph`${productName} is a coding tool in the browser. Each
          workspace is one task with its own branch and its own cloud
          computer, where agents powered by Claude and Codex work.`,
        paragraph`${productName} is free for now. It has no plans and no
          billing.`,
      ],
    },
    {
      title: 'Your accounts',
      blocks: [
        list(
          text`You sign in with GitHub, through the GitHub App of
            ${productName}. The app can reach each repository where you
            install its GitHub App and have access.`,
          text`${productName} runs the cloud computers of every org in its
            own account with its cloud computer provider. You need no
            account or key of your own for them.`,
          text`The agents run on the Claude or OpenAI login that you connect.
            The model use of each message bills to the account of the member
            who started its session, under the terms of Anthropic or OpenAI.
            The runs of a routine start their sessions on the login of the
            member who owns the routine.`,
          text`Keep your keys and logins safe.
            ${draft('To write: your duties for the use of your keys and logins')}`,
        ),
      ],
    },
    {
      title: 'Working in an org',
      blocks: [
        list(
          text`Every member of an org sees all of its workspaces and all of its
            routines, and can send messages in each workspace.`,
          text`Each session runs on the agent login of the member who started
            it. The messages of other members use that login only when its
            owner allows it. Otherwise, the message of another member starts a
            new session on the login of that member. Each turn's git calls use
            a GitHub token of the member whose message started the turn.
            Pushes and pull requests show as that member.`,
          text`That GitHub token reaches every repository where that person
            installed the GitHub App and has access, not only the
            repositories of the org.`,
          text`Each login that you connect has a setting that lets other
            members use it in the sessions that you start. For a Claude
            subscription, the setting starts off. For an API key, it starts
            on. When you replace a login with one of the same kind, the
            setting stays. You can change it on your account page.
            ${draft("Do Anthropic's terms let other members use a member's Claude subscription?")}`,
          text`While a turn runs, its agent login and its GitHub token are in
            the cloud computer of the workspace. A member with a terminal in
            that cloud computer can read them. A program that a tool of the
            agent starts, such as a dev server, can keep the agent login after
            the turn ends. A member with a terminal can read it there too. The
            setting of your login does not change this. Work in an org only
            with people whom you trust with your logins.`,
          text`A routine runs an agent without a person, on a schedule or when
            a pull request opens, gets new commits, or merges. Each run starts
            a new workspace as the member who owns the routine. The run uses
            the agent login and the GitHub token of that member, so its pushes
            and pull requests show as that member.`,
          text`Only the owner of a routine changes it or turns it on. An admin
            can turn it off or delete it. When the owner leaves the org, the
            routine moves to the member who gets their workspaces. It stays
            off until that member turns it on, with their own logins.`,
          text`The run of a routine for a pull request reads that pull request,
            also the comments, reviews, and descriptions of other GitHub
            accounts. Such text can steer the agent while the run holds the
            logins of the owner and the env vars of the org.`,
          text`Admins manage the members, the repositories, the scripts, and
            the env vars of the org.`,
        ),
      ],
    },
    {
      title: 'Acceptable use',
      blocks: [
        paragraph`Use ${productName} only for lawful purposes that you have
          the right to carry out, and that harm no other person or system.
          Also follow the terms of GitHub, Anthropic, and OpenAI. Do not use
          ${productName} or its cloud computers to:`,
        list(
          text`break a law, a sanction, or an export control, or the rights
            of other people, such as their privacy or their intellectual
            property`,
          text`store, make, or share content that is illegal, such as child
            sexual abuse material, or content that supports terrorism or
            violent extremism`,
          text`run malware, ransomware, botnets, or command and control
            servers, or send spam, phishing, scams, or other fraud`,
          text`attack other systems, for example with denial of service,
            credential stuffing, account takeover, intrusion, scans that the
            owner did not allow, or aggressive scraping`,
          text`mine cryptocurrency, or run work whose main purpose is to use
            computing resources and not to build software`,
          text`keep cloud computers busy without a purpose, get around limits
            or protections against abuse, hide what you do, or harm
            ${productName}, its cloud computers, or other networks`,
          text`share, rent, or sell your account or your access, or resell
            the cloud computers as computing capacity`,
          text`break the rules of the providers that run ${productName}`,
        ),
        paragraph`You are responsible for what your cloud computers make
          public, such as a port preview. Public content must be lawful, and
          it must not be abusive.`,
        paragraph`${draft('To confirm: that these rules give the providers of the service at least the protection of their own rules')}`,
      ],
    },
    {
      title: 'Suspension',
      blocks: [
        paragraph`The operator can suspend an account or an org that breaks
          these terms, or whose use puts other people or the service at
          risk. When the risk is urgent, the operator can suspend without
          notice.`,
        paragraph`A suspension of an account ends its sign-in. It stops the
          cloud computers of the workspaces that the account owns, closes
          their previews, and blocks new starts. Its routines start no
          runs.`,
        paragraph`A suspension of an org stops each cloud computer of the org,
          closes its previews and terminals, and blocks each start, build,
          and routine run. Its members keep their accounts and their other
          orgs. They can still open the org and read its chat history.
          Nothing in the org can change, except that a member can leave it.
          An admin can leave only while another admin whose account is not
          suspended remains.`,
        paragraph`A stopped cloud computer gets no restart to keep its disk
          while its workspace owner or org is suspended. So its disk can be
          deleted, with any work that is not pushed to GitHub.`,
        paragraph`To ask about a suspension, write to ${mailLink(abuseAddress)}.`,
        paragraph`${draft('To write: how the operator tells you about a suspension, how you ask for a review, and what happens to your data')}`,
      ],
    },
    {
      title: 'Report abuse',
      blocks: [
        paragraph`To report abuse of ${productName}, such as spam, an attack,
          or harmful content in a preview, write to
          ${mailLink(abuseAddress)}. Include the address of the preview or a
          description of what you saw.`,
        paragraph`The operator also answers notices about security,
          copyright, and law enforcement at the same address.`,
      ],
    },
    {
      title: 'Your work',
      blocks: [
        paragraph`Your repositories, files, and agent sessions live in the
          cloud computers that ${productName} runs for your org.
          ${productName} keeps the chat history of each workspace, so that
          you can read it while the cloud computer is stopped.`,
        paragraph`${draft('To write: the rights in your content, and the permission that the operator needs to run the service')}`,
      ],
    },
    {
      title: 'Ending your use',
      blocks: [
        paragraph`An admin can delete an org. ${productName} then stops the
          cloud computers of the org at once. It deletes the org after 7
          days, unless an admin restores it.`,
        paragraph`${draft('To write: how you close your account, and what the operator deletes then')}`,
      ],
    },
    {
      title: 'Availability and liability',
      blocks: [
        paragraph`${draft('To write: the availability of the service, its warranties, and the limits of liability')}`,
      ],
    },
    {
      title: 'Changes to these terms',
      blocks: [
        paragraph`A changed version of these terms applies from your next sign-in.
          A sign-in session lasts at most 7 days, so a change applies within 7 days
          while you keep using ${productName}. You accept the changed version
          when you continue with GitHub.`,
      ],
    },
    {
      title: 'Law and disputes',
      blocks: [
        paragraph`${draft('To confirm: the law that governs these terms, and the courts for disputes')}`,
      ],
    },
  ],
}
