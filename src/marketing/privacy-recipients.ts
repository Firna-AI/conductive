import { productName } from '../../docs/mockups/src/brand'
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
        write a short name from the text of its first message. The model
        requests of the agents in a newer cloud computer, and their
        answers, pass through ${productName} on Cloudflare. Agent settings
        in the repository can send these requests to another address
        instead.`,
      text`GitHub signs you in, and gives ${productName} access to your
        repositories through its GitHub App. By default, each commit made in
        a cloud computer carries its author's GitHub display name or login
        and GitHub no-reply address. That address contains the author's GitHub
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
      text`Anthropic and OpenAI get your messages, your files, and your
        code when an agent works on them. Each Mac command request and its
        result also go to the agent and to Anthropic or OpenAI.
        With each message, they also get
        the GitHub login, the display name, and the ${productName} user ID of
        its sender. They get the
        names of the workspace branch and the branch that a pull request
        targets. Later messages give the current names when either branch
        changes. Each workspace branch starts with the GitHub login of the
        workspace owner when that branch is created. From a newer cloud
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
        the GitHub token of a turn that runs there. During Continue, they
        can also read the GitHub token of the member who clicked, while the
        branch fetch runs. Outside an agent turn,
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
        token, and the env vars of the org. Such text can also steer the
        agent to read and change work across the org, with your workspace
        tool rights. Messages follow the same session login rules.`,
      text`A workspace token is a credential for the workspace tools.
        Any program with that token can read workspace, session, and
        message details, list sessions and previews, and read chats across
        its org without a running turn.
        A copied token keeps this access after the person who copied it
        leaves the org. This access lasts while the token remains valid
        and the org remains active.`,
      text`During a turn in the calling workspace, the tools can also
        create, rename, move, and archive workspaces across the org.
        They can create, rename, stop, and close sessions, and send
        messages. They can create and delete sections, and open and close
        private previews. The actions use that turn's sender, who must
        still belong to the org. Each action follows that member's rights
        in the app.`,
      text`Only a workspace owner or org admin can archive it.
        An agent can archive the workspace where it runs, which ends its
        turn. Previews that agents open need sign-in and workspace access.
        The session's login rules apply to messages.
        An agent can send chat text that it reads to Anthropic or OpenAI
        as part of its work.`,
      text`The members of your orgs also see who started each session,
        whose login it uses, and whether it can use that login. They also
        see whether its starter lets other members use that login.`,
      text`If the operator suspends your account, the members of your orgs
        learn that it is suspended. A workspace that you own then says
        that its owner is suspended, until an operator lifts the
        suspension.`,
    ),
  ],
}
