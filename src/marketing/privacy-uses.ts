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
        each message. Your ${productName} user ID goes with them, so that
        agents can find your workspaces.`,
      text`Commit authors: by default, each commit in a cloud computer names
        the person whose GitHub token Git uses as author and committer. In a
        workspace with older cloud computer software, agent commits name the
        workspace owner by default. A Git setting, a variable, or an option
        in the cloud computer can name another author, and the commit then
        carries that author. The default name is their GitHub display name,
        or their login when the display name is missing or unusable. ${productName} uses their GitHub user ID and
        login to make their GitHub no-reply address,
        <id>+<login>@users.noreply.github.com. The address lets GitHub link
        the commit to their account without showing their private email.`,
      text`Your GitHub emails: at each sign-in, ${productName} keeps the
        verified email addresses of your GitHub account, and which one is
        primary. An org invitation reaches you through one of them. The
        approval email goes to the primary one. The team uses the same
        address to reply to your feedback.`,
      text`Your GitHub token: the sign-in gives ${productName} a GitHub
        token for your account. ${productName} stores it encrypted, for
        every account, also while you wait for app access. It uses the
        token to read GitHub for you, and for the git calls of your
        turns. It reads your repository rights and merge method. A merge
        uses the token of the member who clicks. Continue fetches the
        latest default branch with the token of the member who clicks
        Continue.`,
      text`The waitlist: a new account without app access waits while the
        waitlist is on or sign-ups are paused. It sees only the waitlist.
        When the waitlist is off and sign-ups are not paused, open sign-up
        gives you app access at sign-in. If you already wait, you get
        access at your next request. You keep that access when the
        waitlist turns on again.`,
      text`App access records: ${productName} records when and how you got
        app access. The record names the operator who approved you,
        the invite code that you used, or the org invitation that you
        accepted, with its org and the admin who sent it. For open
        sign-up, it names that method and the operator who turned the
        waitlist off. ${productName} also keeps the time and operator of
        the last change to the waitlist setting. These records let the
        operator trace misuse back to a code or a person.`,
      text`Invite codes: each account with app access has an invite code
        with 5 invites. ${productName} keeps who used each code, and when.
        You see how many of your invites are left, but not who used them.
        The operator sees both.`,
      text`The approval email: when an operator approves your account,
        ${productName} sends one email to the primary verified email of
        your GitHub account, and keeps whether it went. A failed send
        goes again for up to 24 hours. An account without a verified
        email gets no email. ${productName} sends no email when the
        waitlist turns off or when you get app access through open
        sign-up.`,
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
        repositories, workspaces, routines, scripts, and settings that you and your
        team make. Each invite includes the invited email address. They
        run the service.`,
      text`Routines: the prompt, the triggers, and the author filters of
        each routine, with the GitHub accounts that a filter names. Each
        run keeps its owner, its agent, its trigger, its state, and its pull
        request. A skipped
        run keeps the GitHub login of the account outside the org whose
        event it skipped. They run the routines and show their runs.`,
      text`Keys and logins: the env var values of each org, and your
        agent logins. An own endpoint login holds the endpoint address and
        its key. ${productName} stores these values encrypted. It
        uses your login only for the turns of the sessions that you start,
        also the sessions that the runs of your routines start. The one
        exception is that ${productName} reads an own endpoint's model list
        with its key, at the times in Endpoint models below.
        The messages of other members in those sessions use it only when
        you let other members use that login. ${productName} keeps agent
        logins outside cloud computers. Each turn gets only a temporary
        credential for model requests through ${productName} while that
        turn runs. ${productName} renews your saved ChatGPT sign-in itself.
        An own endpoint's address and key never reach a cloud computer.
        ${productName} starts turns only with supported agent software.`,
      text`Endpoint models: ${productName} reads the endpoint's model list
        with its key when you save the login or press Refresh on your account
        page. It also reads the list in the background when a turn on that
        login starts, at most once in 10 minutes. It stores the model IDs
        from the last list it could read to set the models in your pickers.`,
      text`Own endpoints: ${productName} sends each model request of a turn
        on an own endpoint login to that endpoint, with its key. The endpoint
        gets the messages, the files, and the command results of each turn
        on the login, whoever sent the message.`,
      text`Your work: ${productName} keeps your messages, including those
        sent by pull request bar actions, and the answers of the agents as
        the chat history of each workspace.
        Messages from agent tools end with Sent by: and a link to the
        sending session. The chat history keeps that link.
        A stop through agent tools also records the sending session.
        This includes a close that stops a running turn. The chat and
        copied transcripts name that session with Stopped from and its link.
        The chat history also records
        who used Continue, the new branch, and the branch it starts from. It keeps
        the last file list and the last summary of changes of each
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
      text`Your code: your repositories and files live in the cloud
        computers that ${productName} runs for your org. ${productName}
        reads a file or a diff when you open it, to show it to you. The
        agents send their model requests through ${productName} to
        Anthropic, OpenAI, or the chosen endpoint.
        Agent settings in the repository can send them to another address
        instead. These model requests can hold your messages, files, code,
        and command results.
        ${productName} adds the login that the session uses, and passes
        each request on. When it passes on these model requests and their
        answers, it keeps no copy of them. It writes no body or header value
        of them to its logs. ${productName} still keeps the chat history and
        the Mac command records above.`,
      text`GitHub events: the state of the pull requests and the checks
        of your branches, which GitHub sends to ${productName}. A routine
        also uses the GitHub accounts that open, push to, or merge a pull
        request, to decide whether the event starts a run.`,
      text`Feedback: your message and any screenshots help the team answer
        questions, find problems, and improve ${productName}. Each message
        includes your ${productName} user ID, GitHub user ID and login, the
        time, the app version, and your browser. It also says whether you
        use the Mac app. It includes the IDs of the current org and open
        workspace when you can reach them. The added context includes no
        page address, org name, or workspace name. The app removes image
        metadata, such as a photo's location, from selected screenshots
        before sending. The reply address is your primary verified email
        on GitHub, when available.`,
      text`Panel sizes: your browser keeps the sizes of the panels of the
        app. They stay in your browser.`,
      text`Last workspaces: your browser keeps the address of the last
        workspace that you opened in each org, with the IDs of the org,
        the workspace, and the session. A switch to the org opens that
        workspace again. They stay in your browser.`,
    ),
    paragraph`Where data protection law requires a lawful basis, the
      operator relies on performance of a contract to provide the
      service to you. It relies on legitimate interests to operate,
      improve, and secure the service and prevent abuse. It also uses
      personal data when necessary to comply with a legal obligation.`,
  ],
}
