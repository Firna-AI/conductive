import { productName } from '../shared/brand'
import { list, text, type LegalDocument } from './legal-text'

/**
 * The privacy notice section on the providers, members, and workspace
 * programs that receive data.
 */
export const privacyRecipientsSection: LegalDocument['sections'][number] = {
  title: 'Who gets your data',
  blocks: [
    list(
      text`Cloudflare runs ${productName} and stores its data.
        If a workspace has no name, Cloudflare's AI model service can
        write a short name from the text of its first message.
        For that request, ${productName} removes each path mention of an
        image attached to that message. It replaces each path mention of
        another attached file with the file's original name. The model
        requests and answers of the agents pass through ${productName} on
        Cloudflare. Agent settings
        in the repository can send these requests to another address
        instead.`,
      text`GitHub signs you in, and gives ${productName} access to your
        repositories through its GitHub App. By default, each commit made in
        a cloud computer carries its author's GitHub display name or login
        and GitHub no-reply address. That address contains the author's GitHub
        user ID and login. GitHub and each reader of the repository see
        that name and address. Each workspace branch name starts with the
        GitHub login of the workspace owner. It can also hold a short form
        of the workspace name, which can come from the text of the first
        message. A push sends the branch name to GitHub, and each reader of
        the repository sees it. When an agent changes the base of an open
        pull request, GitHub gets the pull request number and the new base
        branch name. The Mac app also checks
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
      text`A cloud computer provider runs each workspace's cloud computer in
        an account that ${productName} owns. The operator can switch an org
        to another account for new workspaces after a successful build of
        its cloud computer setup there. Existing workspaces keep their
        accounts. Your code, your files, and your agent sessions
        are in those computers. ${productName} sends their provider
        requests to start, stop, and use them.`,
      text`For a ChatGPT sign-in, OpenAI sends the account owner's email,
          account ID, and ChatGPT workspace name through ${productName} to
          the cloud computer. Codex uses them to run on that workspace.
          Programs and members with terminal access there can read them.
          ${productName} stores the sign-in encrypted and renews it alone.
          The real ChatGPT sign-in tokens stay outside every cloud computer.
          Codex reads a temporary turn credential from a file for its
          session. The file also holds public account claims and a
          placeholder refresh token. It is removed when the turn ends.
          ChatGPT workspace
          rules can run hooks and MCP commands in the org's cloud computer.
          Those commands can reach its files and available credentials.`,
      text`Anthropic, OpenAI, or the chosen endpoint gets the messages,
        files, code, and command results of turns on the session's login.
        This includes the messages of other members who use that login.
        With Explain, the first message of a new session holds the text that
        a member selects in a chat, with the text around it. That text can
        come from a message of another member or from a session on another
        login.
        Each Mac command request and its result also go to the agent and
        to that provider or endpoint. They also get each listed secret's
        name, description, and environment variable name. They get the
        output of each command that the agent runs with a secret.
        That output hides each exact copy of a secret value, but not a
        changed or encoded value.
        With each message, they also get
        the GitHub login, the display name, and the ${productName} user ID of
        its sender. They also get the names of secrets that a session uses
        with no request, and the name of each member who changes the
        capabilities of its workspace. They get the names of the workspace
        branch and its base branch. Later messages give the current names
        when either branch changes. Each workspace branch name starts with
        the GitHub login of the workspace owner. It can also hold a short
        form of the workspace name. The agents send them
        through ${productName}, which adds the agent login.
        Agent settings in the repository can send them to another address
        instead. Each session keeps a personal login or the org login.
        A new session uses its starter's usable personal login, or else
        the org login. An admin can give the org login priority for new
        sessions with Use for every member. Older sessions keep their
        login. Automation runs follow the same rule for their owner.
        An org endpoint gets the data of each turn on it, including
        automation runs. Each member can send messages on a session's org login.
        Your messages on another member's personal login use it only while
        that member shares it. Otherwise, your message starts a new session
        under the rule above. A message does the same if the session's
        login cannot be used. The app refuses the message when no usable
        login serves its sender. The terms of that provider or endpoint apply.`,
      text`The members of your orgs see the workspaces of the org,
        their chats, and each Mac command request and result. They can read
        the service lists and logs with workspace read access. They also
        see the automations of the org, with their prompts, chosen secret names, and
        their runs. Only the automation's owner changes its chosen secrets.
        They see each secret request and result, without a value. They see the name
        and the description of each secret, who added it, and who last
        revealed its current value. In an active org, an admin can reveal
        the value of each secret, also of a secret that you added.
        A member with a terminal in a cloud computer can read
        the GitHub token of a turn that runs there. They can also read the
        value of a secret while a command runs with it there. During Continue
        or a repository change, they can also read the GitHub token of the
        member who started it, while the branch fetch runs. When an agent
        changes the base or the workspace follows a change on GitHub, the
        fetch uses the workspace owner's GitHub token. Members with a
        terminal can read it while the fetch runs. Outside an agent turn,
        the GitHub CLI uses the workspace owner's account. Each member with
        a terminal can get that owner's GitHub token without a running
        turn.`,
      text`A member with a terminal or a program in a cloud computer can
        read the temporary credential of a turn that runs there. Through
        ${productName}, that credential can use the session's personal or
        org login. It works while the turn runs, also from
        outside the cloud computer. A program that keeps running, such as a
        service or a program that the startup script starts, can also
        get the credentials of later turns. This includes the turns of
        sessions that other members start. Agent settings in the repository
        can make the agent send its model requests, with their content and
        the credential of the turn, to another address. A commit, the agent,
        or other code can change those settings. The setting that lets other
        members use a personal login does not change this. After Stop, a
        credential can start no new request. A request that still runs ends
        at the first check of its turn that answers after the turn ends.
        ${productName} checks every 15 seconds. While no check answers, the
        request can run to the end of its answer. If the login is removed or
        changed, the turn ends at its next model request. A turn on a
        personal login also ends there if its owner loses org access.`,
      text`The run of your automation for a pull request reads the comments,
        reviews, and descriptions of other GitHub accounts. Such text can
        steer the agent while the run uses its session's agent login, your
        GitHub token, and the org's env vars. It can also steer the agent to
        run commands with the secrets that need no new approval, such as a
        secret that an admin marked for all agents or one that you chose
        for the automation. The automation page warns every member about
        this risk when the automation has a pull request trigger and a
        chosen secret.
        Such text can also steer the agent to read and change work across
        the org, with your workspace tool rights. This includes changing
        a workspace's base and, with GitHub write access, the base of its
        open pull request. Messages follow the same session login rules.`,
      text`A workspace token is a credential for the workspace tools.
        Any program with that token can read workspace, session, and
        message details, list sessions and previews, and read chats across
        its org. It can also list each secret's name, description, and
        environment variable name. These reads need no running turn.
        A copied token keeps this access after the person who copied it
        leaves the org. This access lasts while the token remains valid
        and the org remains active.`,
      text`During a turn in the calling workspace, the tools can also
        create, rename, move, and archive workspaces across the org.
        They can also change the base branch of a workspace in the org.
        They can create, rename, stop, and close sessions, send messages,
        and watch one turn of a session. They can create and delete
        sections, and open and close private previews.
        The actions use that turn's sender, who must
        still belong to the org. Each action follows that member's rights
        in the app. The tools can also run a command with each secret that
        the session of that turn may use, with no question.`,
      text`A watch tells the session that set it once when the watched turn
        finishes, fails, or stops. Its wake can start a new turn after the
        turn that set the watch ended. That new turn acts for the member
        whose turn set the watch, with that member's GitHub token and Mac.
        A wake that joins a running turn keeps that turn's sender.
        Current membership and session login rules apply at delivery.`,
      text`Only a workspace owner or org admin can archive it.
        An agent can archive the workspace where it runs, which ends its
        turn. Previews that agents open need sign-in and workspace access.
        The session's login rules apply to messages.
        An agent can send chat text that it reads to Anthropic, OpenAI,
        or the chosen endpoint as part of its work.`,
      text`The members of your orgs also see who started each session,
        whose login it uses, and whether it can use that login. For a
        personal login, they also see whether its starter shares it.
        Members can read the kind of each org login, its endpoint host, and
        its Use for every member setting in the org settings. They see no
        saved key or full endpoint address.`,
      text`If the operator suspends your account, the members of your orgs
        learn that it is suspended. A workspace that you own then says
        that its owner is suspended, until an operator lifts the
        suspension.`,
    ),
  ],
}
