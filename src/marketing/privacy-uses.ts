import { productName } from '../shared/brand'
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
        address to reply to your feedback. The operator sees the primary
        one on the page of your account.`,
      text`Your GitHub token: the sign-in gives ${productName} a GitHub
        token for your account. ${productName} stores it encrypted, for
        every account, also while you wait for app access. It uses the
        token to read GitHub for you, and for the git calls of your
        turns. It reads your repository rights and merge method.
        It reads the current branch list with your token and stores no copy
        of that list. It checks named branches other than the default before
        creating a workspace. This check uses the GitHub token of the member
        who requests the workspace. Selecting a merge action or Ready for
        review uses your GitHub token. Add to merge queue uses it to mark a
        draft ready. An automatic merge uses the stored GitHub token of the
        member who added the last pull request that the queue asks GitHub
        to merge. The queue sends agent turns as the member who added the
        pull request. Continue fetches the branch that the pull request
        merged into with the token of the member who clicks Continue.
        If that branch no longer exists, it fetches the default branch.
        A repository change fetches the latest default branch of the new
        repository with the token of the member who changes the repository.
        For a workspace outside the merge queue, ${productName} fetches
        the default branch if GitHub deletes its base or changes the default
        branch it follows. The cloud computer uses the new base only after
        the fetch succeeds. When no member starts the move, the fetch
        uses the workspace owner's GitHub token. This includes moves from
        GitHub events, automatic retries, and resumes of stopped cloud
        computers. A merge queue base fetch also uses the workspace owner's
        GitHub token.`,
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
      text`Your last activity: ${productName} keeps one time for your
        account. It is the time when you last created a workspace or sent a
        chat message in the app. It keeps no history. The operator sees
        this time, to know which accounts are still in use.`,
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
        repositories, workspaces, automations, scripts, and settings that you and your
        team make. Each invite includes the invited email address. They
        run the service.`,
      text`Automations: the prompt, the triggers, the chosen org secrets, and
        the author filters of each automation, with the GitHub accounts
        that a filter names. Each run keeps its owner, its agent, its trigger,
        its state, and its pull request. Each run workspace records the
        chosen secrets as pre-approved by the owner. Its agents use them
        without a new request. A skipped
        run keeps the GitHub login of the account outside the org whose
        event it skipped. They run the automations and show their runs.`,
      text`Keys and logins: the env var values and agent logins of each
        org, the values of its secrets, and your personal agent logins. An
        own endpoint login holds the endpoint address and its key.
        ${productName} stores these values encrypted. It
        uses a login only for the turns of sessions on it, including
        automation runs. The one
        exception is that ${productName} reads an own endpoint's model list
        with its key, at the times in Endpoint models below.
        A personal login serves the sessions that its owner starts on it.
        Other members use a personal login in those sessions only when its
        owner allows it. Each member can send messages on a session's org
        login. ${productName} keeps agent
        logins outside cloud computers. Each turn gets only a temporary
        credential for model requests through ${productName} while that
        turn runs. ${productName} renews your saved ChatGPT sign-in itself.
        An own endpoint's address and key never reach a cloud computer.
        ${productName} starts turns only with supported agent software.`,
      text`Secrets: the Secrets settings of an org keep the name, the
        description, and the value of each secret. They also keep the member
        who added it, whether it is for all agents, and the admin and the
        time of each reveal. ${productName} keeps the approvals of each
        session and the pre-approvals of each workspace. It also keeps a
        value that a member gives an agent, for 15 minutes or until its
        workspace is archived. They let an agent use a secret in a command
        only after a member allows it.`,
      text`Endpoint models: ${productName} reads the endpoint's model list
        with its key when you or an admin save the login or select Refresh. For a
        personal login, you use Refresh on your account page. For an org
        login, an admin uses Refresh on the Agents tab of the org settings.
        When you or an admin save a Codex endpoint whose address gives no
        model list, it can read the list a second time, at that address with
        /v1 added. When only that read gives a list, it saves the address
        with /v1 added. It also reads the list in the background when a turn
        on that login starts, at most once in 10 minutes. It stores the model
        IDs from the last list it could read to set the models in your
        pickers. For an org endpoint, that list sets the pickers of every
        member on the org login.`,
      text`Own endpoints: ${productName} sends each model request of a turn
        on an own endpoint login to that endpoint, with its key. The endpoint
        gets the messages, the files, and the command results of each turn
        on the login, whoever sent the message.`,
      text`Your work: ${productName} keeps your messages, including those
        sent by pull request bar actions and by Explain, and the answers of
        the agents as the chat history of each workspace.
        It also keeps messages from the merge queue.
        Messages from agent tools end with Sent by: and a link to the
        sending session. The chat history keeps that link.
        Explain sends a message for you that quotes the text that you
        select, with the text around it and a link to its session. The new
        session keeps that quote and its place, so that the chat marks it.
        A stop through agent tools also records the sending session.
        This includes a close that stops a running turn. The chat and
        copied transcripts name that session with Stopped from and its link.
        The chat history also records who used Continue, the new branch,
        and the branch it starts from. It also records who changed the
        repository of a workspace, the new repository, and the new branch.
        It also records who changed the capabilities of a workspace, and
        the names of the secrets that changed. It keeps the last file list
        and the last summary of changes of each workspace. With the chat
        history, it keeps each list of the servers that run in the cloud
        computer of a workspace: the port, a short program name, and the
        folder of each server. It also keeps the latest list of the skills
        of each workspace, with the name and the description of each skill.
        The files that you attach to a message stay in the storage of
        ${productName} at Cloudflare until the agent starts work on the
        message. The cloud computer of the workspace then downloads them.
        When the cloud computer has a file and its first start succeeded,
        ${productName} deletes its own copy. The file stays in the cloud
        computer. Removing the workspace from the list keeps its chat
        history until the org is deleted.`,
      text`Services: a service is a named program outside an agent turn.
        ${productName} keeps its filtered name, short program label, folder,
        state, times, exit result, ports, and originating session when it
        can match that session. Otherwise, the source shows Local command.
        This context does not prove which person started it. The list
        and control results let members follow and manage services.
        The saved full command, environment values, and raw logs stay in
        runtime storage on the cloud computer. ${productName} reads and
        filters recent output when a member opens or reloads its log.
        It sends that excerpt to the member to show the log.`,
      text`Operational logs: ${productName} records when the program that
        runs workspace agents connects to the service or disconnects.
        It also records turns that end without a Stop request, including
        whether they finished, stopped, or failed.
        It also records work on a message from that program when a restart
        of the service ends that work. That record holds the kind of the
        work, how far it got, the event type and number, and the size of the
        message. To find such work, ${productName} keeps a short note of
        the work that starts in the first 30 seconds after the program
        connects. It keeps the note while the work runs, and after a
        restart until the program connects again.
        When a member's app reads the sessions of a workspace,
        ${productName} also records each session whose active turn the service
        does not count as running. That record holds the stored state of the
        turn, the reason, and the start time of the turn.
        These records include the workspace ID and any available session,
        turn, connection, and event stream IDs, and communication protocol
        version. When available, they also include a random ID for each start
        of that program. The team uses these logs to investigate connection
        problems, program restarts, interrupted agent work, and turns that show
        as working after they end. These logs hold no tokens, secret values,
        message text, file contents, or connection close reasons.
        ${productName} also records when each step of a cloud computer
        build and of a workspace start begins and ends, with the IDs of the
        org, the workspace, and the build or the start, and the time of its calls to
        other services. The team uses these records to make builds and
        starts faster. They hold no names of repositories or branches, and
        no message text, file contents, or secret values.`,
      text`Mac commands: ${productName} keeps each request and its result.
        They record the command, its folder, its reason, its time limit,
        and the output. A request also names the Mac that gets it.
        The result says how the command ended. They let you and the
        agent follow the command. Always-allowed commands and workspace
        permissions stay only on your Mac. The Mac saves timed permissions,
        including the end time set by Extend. Permission until you stop
        stays only in memory and ends when you quit the Mac app or sign out.`,
      text`Secret requests: ${productName} keeps each request of an agent
        for a secret, and its result, in the chat history. They record the
        names, the reason, the command that the agent said it would run, the
        member who answered, and what let the command run. They never hold a
        value or the output of the command.`,
      text`Your code: your repositories and files live in the cloud
        computers that ${productName} runs for your org. ${productName}
        reads a file or a diff when you open it, and a picture that an
        agent answer shows, to show it to you. The
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
        of your branches, and the new name, owner, or default branch of a
        repository, which GitHub sends to ${productName}. An automation
        also uses the GitHub accounts that open, push to, or merge a pull
        request, to decide whether the event starts a run.`,
      text`For each merge queue, ${productName} keeps its repository and
        default branch. Each entry records its workspace, pull request,
        place, member who added it, state, and the time of each step.
        The queue uses these records and GitHub events to run and show its
        progress to the org. For the workspace list, ${productName}
        temporarily stores your write access and when GitHub checked it.
        It also stores open pull request bases, whether they come from
        forks, and whether the default branch needs GitHub's queue.`,
      text`Merge records: ${productName} keeps one record for each merged
        pull request of a workspace branch. This includes each pull request
        that the queue merges. The record holds the GitHub
        repository ID, the pull request number, the org, the workspace, the
        workspace owner at the time of the record, the merge time from
        GitHub, and the time of the record. ${productName} writes it when it
        reads a merged pull request from GitHub for a workspace, and when
        GitHub sends the event of the merge, also for an archived workspace.
        The records are for the counts of merged pull requests on the Stats
        tab of your account page.`,
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
      text`Feedback send records: ${productName} keeps your user ID, hashed
        delivery identifiers, random identifiers, attempt times, delivery
        status, and active request counts. They limit feedback sends and
        prevent duplicate emails. These records hold no message, screenshot,
        email address, or secret.`,
      text`Panel sizes: your browser keeps the sizes of the panels of the
        app. They stay in your browser.`,
      text`Last workspaces: your browser keeps the address of the last
        workspace page that you opened in each org. The address holds the
        IDs of the org, the workspace, and the session, the preview, the
        port of a preview, or the terminal. It can also hold the name of a
        tool and the path of an open file. A switch to the org opens that
        page again. The addresses stay in your browser, also after you sign
        out, until you clear its saved data.`,
    ),
    paragraph`Where data protection law requires a lawful basis, the
      operator relies on performance of a contract to provide the
      service to you. It relies on legitimate interests to operate,
      improve, and secure the service and prevent abuse. It also uses
      personal data when necessary to comply with a legal obligation.`,
  ],
}
