import { productName } from '../../docs/mockups/src/brand'
import { list, text, type LegalDocument } from './legal-text'

/**
 * The section of the privacy notice that says who gets personal data: the
 * providers of the service and the members of each org. It uses the newer
 * and older cloud computers that the Keys and logins item of `privacy.ts`
 * defines. The facts come from the architecture and the protocol docs.
 */
export const privacyRecipientsSection: LegalDocument['sections'][number] = {
  title: 'Who gets your data',
  blocks: [
    list(
      text`Cloudflare runs ${productName} and stores its data.
        Cloudflare's AI model service also writes a short name for each
        new workspace from the text of its first message. The model requests
        of the agents in a newer cloud computer, and their answers, pass
        through ${productName} on Cloudflare.`,
      text`GitHub signs you in, and gives ${productName} access to your
        repositories through its GitHub App. The Mac app also checks
        GitHub for updates and downloads new versions. These requests
        send your network address to GitHub.`,
      text`A cloud computer provider runs the cloud computers of every org
        for ${productName}, in the account of ${productName}. Your code,
        your files, and your agent sessions are in them. ${productName}
        sends the provider the requests that start, stop, and use them.`,
      text`Anthropic and OpenAI get your messages, your files, and your
        code when an agent works on them. From a newer cloud computer, the
        agents send them through ${productName}, which adds the agent
        login. With the older software in an older cloud computer, the agents
        send them directly, with the agent login. Each session uses the login of
        the member who
        started it. Your messages in another member's session use that
        member's login only when that member lets other members use it.
        When that member does not share the login, your message starts a
        new session on your own login. The terms of that provider apply.`,
      text`The members of your orgs see the workspaces of the org and
        their chats. A member with a terminal in a cloud computer can read
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
        sessions that other members start. The setting that lets other
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
