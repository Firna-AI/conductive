import { productName } from '../../docs/mockups/src/brand'
import { list, paragraph, text, type LegalDocument } from './legal-text'

/**
 * The section of the privacy notice that lists the personal data that
 * the product uses, and why. It lives in its own module to keep the
 * privacy notice under the file length limit.
 */
export const privacyUsesSection: LegalDocument['sections'][number] = {
  title: `What ${productName} uses, and why`,
  blocks: [
    list(
      text`Your GitHub account: your GitHub user ID, login, display name,
        avatar, and the date when you created the account. They sign you
        in, and they show who owns and who sends each piece of work. The
        operator sees the age of the account when you wait for app
        access. Your login and display name also tell the agents who sent
        each message.`,
      text`Commit authors: each commit in a cloud computer names the person
        whose GitHub token Git uses as author and committer. In a workspace
        with older cloud computer software, agent commits name the workspace
        owner. The name is
        their GitHub display name, or their login when the display name is
        missing or unusable. ${productName} uses their GitHub user ID and
        login to make their GitHub no-reply address,
        <id>+<login>@users.noreply.github.com. The address lets GitHub link
        the commit to their account without showing their private email.`,
      text`Your GitHub emails: at each sign-in, ${productName} keeps the
        verified email addresses of your GitHub account, and which one is
        primary. An org invitation reaches you through one of them. The
        approval email goes to the primary one.`,
      text`Your GitHub token: the sign-in gives ${productName} a GitHub
        token for your account. ${productName} stores it encrypted, for
        every account, also while you wait for app access. It uses the
        token to read GitHub for you, and for the git calls of your
        turns.`,
      text`The waitlist: a new account waits for app access, and sees only
        the waitlist until then. ${productName} records when and how you
        got app access. The record names the operator who approved you,
        the invite code that you used, or the org invitation that you
        accepted, with its org and the admin who sent it. It lets the
        operator trace misuse back to a code or a person.`,
      text`Invite codes: each account with app access has an invite code
        with 5 invites. ${productName} keeps who used each code, and when.
        You see how many of your invites are left, but not who used them.
        The operator sees both.`,
      text`The approval email: when an operator approves your account,
        ${productName} sends one email to the primary verified email of
        your GitHub account, and keeps whether it went. A failed send
        goes again for up to 24 hours. An account without a verified
        email gets no email.`,
      text`Your agreement: you accept the current version of the terms at
        each sign-in. ${productName} keeps the latest version that you
        accepted, and the time when you first accepted it. They show that
        you accepted the terms.`,
      text`A suspension: if the operator suspends your account,
        ${productName} records the time and the operator who suspended
        it. An operator can lift the suspension, and ${productName}
        records each lift in the same way. It keeps every record. A
        suspension keeps your cloud computers stopped until an operator
        lifts it.`,
      text`Your session: a cookie of the app keeps you signed in. A
        second cookie protects the GitHub sign-in while it runs. A third
        cookie keeps the screen that you left for GitHub, for up to 1 hour.`,
      text`Your orgs: the orgs, members, roles, invites, sections,
        repositories, workspaces, scripts, and settings that you and your
        team make. They run the service.`,
      text`Keys and logins: the env var values of each org, and your
        Claude or OpenAI logins. ${productName} stores them encrypted. It
        uses your login only for the turns of the sessions that you start.
        The messages of other members in those sessions use it only when
        you let other members use that login. A newer cloud computer starts
        from an org image that requires ${productName} to keep agent logins
        outside the cloud computer. ${productName} enforces this requirement
        for computers that start from that image. Each turn of your sessions
        there gets only a credential that works through ${productName}
        while that turn runs. An older cloud computer starts from an earlier
        org image. ${productName} still permits older software there that
        receives your login itself. Installing newer software in that cloud
        computer does not remove this risk. A new image build gives the
        protection to each cloud computer that starts from it.`,
      text`Your work: ${productName} keeps your messages and the answers
        of the agents as the chat history of each workspace. It also
        keeps the last file list and the last summary of changes of each
        workspace. With the chat history, it keeps each list of the
        servers that run in the cloud computer of a workspace: the port,
        a short program name, and the folder of each server. The files
        that you attach to a message stay in the
        storage of ${productName} at Cloudflare. When the agent starts
        work on the message, ${productName} copies them to the cloud
        computer of the workspace.`,
      text`Mac commands: ${productName} keeps each request and its result.
        They record the command, its folder, its reason, its time limit,
        and the output. A request also names the Mac that gets it.
        The result says how the command ended. They let you and the
        agent follow the command. Always-allowed commands and 15-minute
        permissions stay only on your Mac.`,
      text`An import from Conductor: in the Mac app, after you allow it,
        ${productName} reads the list of your local Conductor workspaces:
        their names, repositories, branches, numbers of sessions, and upload
        sizes. The Mac app sends this list to ${productName}, which shows it
        to you in the app and keeps no copy. For each workspace that you
        import, the Mac app uploads the work that GitHub does not hold, the
        agent session files of its sessions, and a document of each session
        to the storage of ${productName} at Cloudflare. ${productName} keeps
        the Conductor ID, the name, the repository, and the branch of each
        imported workspace. It keeps the title, the agent, the number of
        messages, and the day of each imported session. The result of an
        import names the files that stayed on your Mac and the sessions that
        did not import, and ${productName} keeps no copy of it.`,
      text`Your code: your repositories and files live in the cloud
        computers that ${productName} runs for your org. The work of an
        import from Conductor stays in the storage of ${productName} until
        a member activates its workspace. ${productName} then copies it to
        the cloud computer of that workspace. ${productName} reads a file
        or a diff when you open it, to show it to you. In a newer cloud
        computer, the agents send their requests to the models of
        Anthropic or OpenAI through ${productName}. Agent settings in the
        repository can send them to another address instead. These model
        requests can hold your messages, your files, and your code.
        ${productName} adds the login that the session uses, and passes
        each request on. When it passes on these model requests and their
        answers, it keeps no copy of them. It writes no body or header value
        of them to its logs. ${productName} still keeps the chat history and
        the Mac command records above.`,
      text`GitHub events: the state of the pull requests and the checks
        of your branches, which GitHub sends to ${productName}.`,
      text`Panel widths: your browser keeps the widths of the panels of
        the app. They stay in your browser.`,
    ),
    paragraph`Where data protection law requires a lawful basis, the
      operator relies on performance of a contract to provide the
      service to you. It relies on legitimate interests to operate and
      secure the service and prevent abuse. It also uses personal data
      when necessary to comply with a legal obligation.`,
  ],
}
