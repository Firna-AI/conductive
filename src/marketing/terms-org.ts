import { productName } from '../shared/brand'
import { list, text, type LegalDocument } from './legal-text'

/**
 * The section of the terms on working in an org: the members, the logins of
 * the sessions, the GitHub tokens, and what a member or a program can read
 * in a cloud computer. The facts come from the architecture and the
 * protocol docs.
 */
export const termsOrgSection: LegalDocument['sections'][number] = {
  title: 'Working in an org',
  blocks: [
    list(
      text`Every member of an org sees all of its workspaces, automations,
        and merge queues.
        A removed workspace opens by direct link or chat link, with
        read-only chat.
        In an active org, members can send messages in workspaces that are
        not archived.
        After a pull request merges, every member can use Continue to start
        the next task in that workspace. Every member can also move a
        workspace to another repository of the org.`,
      text`The workspace tools let agents read workspace, session, and
        message details, list sessions and previews, and read chats across
        the org. They also list each org secret's name, description, and
        environment variable name.
        Agents can read removed workspaces and their sessions by ID.
        Workspace lists leave out removed workspaces unless the agent asks
        for them.
        A workspace token is a credential for those tools. Any program
        with it can make these reads without a running turn.
        A copied token keeps that access after the person who copied
        it leaves the org. This access lasts while the token remains valid
        and the org remains active.`,
      text`During a running turn in the calling workspace, the tools can
        also create, rename, move, and archive workspaces across the org.
        They can create, rename, stop, and close sessions, send messages,
        and watch one turn of a session. They can create and delete
        sections, and open and close private previews.
        These actions use that turn's sender, who must
        still belong to the org. Each action follows that member's rights
        in the app. The tools can also run a command with each secret that
        the session of that turn may use, and ask members for the others.`,
      text`A watch tells the session that set it once when the watched turn
        finishes, fails, or stops. Its wake can start a new turn after the
        turn that set the watch ended. That new turn acts for the member
        whose turn set the watch, with that member's GitHub token and Mac.
        A wake that joins a running turn keeps that turn's sender.
        Current membership and session login rules apply at delivery.
        An automatic idle stop keeps the watch.`,
      text`Only the workspace owner or an org admin can archive it.
        An agent can archive the workspace where it runs, which ends its
        turn. The actions ask no separate approval. Previews that agents
        open need sign-in and workspace access. Tool messages follow the
        session login rules below.`,
      text`An admin can connect an Anthropic or OpenAI API key, or an own
        endpoint, as the org login for an agent. The admin must have
        permission to use that key or endpoint for the org. A Claude
        subscription token or ChatGPT sign-in cannot be an org login.`,
      text`Members see the org login read-only in the Agents tab of Settings.
        Nobody sees the saved key or full endpoint address. The org login
        stays when the admin who connected it leaves. The account of the
        key or endpoint pays for model use, including automation runs.`,
      text`Each session keeps its starter's personal login or the org
        login. Each member can send messages on a session's org login.
        Other members use a personal login only when its owner allows it.
        Otherwise, their message starts a new session under the login rule
        above. A message also starts a new session when the session's login
        cannot be used. If no usable login serves the sender, the message
        cannot run. Each turn's git calls use a GitHub token of the
        member whose message started the turn.
        Pushes and pull requests show as that member. Selecting a merge
        action uses the GitHub token of the member who selects it, including
        in the queue. GitHub shows that member as the merger and checks
        their rights and the branch rules.
        Ready for review of a draft pull request also uses the GitHub token
        of the member who clicks, and GitHub checks their rights.
        Outside an agent turn, the GitHub CLI uses the workspace owner's
        account.
        Each terminal connection uses that same account.`,
      text`That GitHub token reaches every repository where that person
        installed the GitHub App and has access, not only the
        repositories of the org.`,
      text`Adding a pull request to the merge queue lets ${productName}
        change its target, rebase its branch, and merge it when ready.
        An automatic merge uses the stored GitHub token of the member who
        added the last pull request that the queue asks GitHub to merge.
        If the creator of the queue's GitHub stack cannot remove it,
        ${productName} can use the token of the member whose action caused
        a queue entry to leave, or the workspace owner's token. The member
        must still belong to the org and have GitHub write access to the
        repository.
        The queue sends agent turns as the member who added the pull
        request. The turn uses the session's agent login.`,
      text`Each personal login has a setting that lets other members use
        it in the sessions that you start on it. For a Claude
        subscription or a ChatGPT sign-in, the setting starts off. For an API key or an own
        endpoint, it starts on. An own endpoint can use personal
        subscriptions. Other members can spend those subscriptions until
        you turn sharing off. When you replace a login with one of the same
        kind, the setting stays. You can change it in Account settings.
        Share a login only when its provider's terms allow that use.`,
      text`Codex can use your ChatGPT plan through device code sign-in.
        ${productName} stores and renews that sign-in. OpenAI sends hosted
        apps to its sign-in waitlist and can block this use. OpenAI's terms
        forbid making your account available to anyone else. The real
        ChatGPT sign-in never enters a cloud computer. If the agent software
        cannot use that sign-in, ${productName} refuses the turn. Ask an
        admin to run Build computer. After it succeeds, create a new
        workspace. You can also connect an OpenAI API key.`,
      text`While a turn runs, its GitHub token is in the cloud computer of
        the workspace. A member with a terminal in that cloud computer can
        read it. During Continue or a repository change, the fetch uses the
        GitHub token of the member who starts it. A member with a terminal
        can also read that token while the fetch runs. A member with a terminal can also get the
        workspace owner's GitHub token without a running turn.`,
      text`An agent can ask to run one command with a secret of the org.
        The command gets the value. The agent gets the secret's name and
        environment variable name, without the value. Any member who sees
        the session can allow the secret for that session.
        A secret that an admin marked for all agents, or that a member
        pre-approved for the workspace, needs no approval.`,
      text`When a member allows a request after the agent stopped waiting,
        a new turn tells the agent. That turn acts for the member whose
        message started the turn that asked, with that member's GitHub
        token and Mac.`,
      text`While a command runs with a secret, its value is in the cloud
        computer. A member with a terminal or a program there can read it
        then, also a member to whom the settings never show the value. A
        program that can use the workspace token during a turn can also get
        the value of each secret that the session of that turn may use.`,
      text`A service is a named program that runs outside an agent turn.
        Its environment uses the org values installed at this computer
        start, plus values supplied for the service. It does not inherit
        the agent's credentials, turn context, or secrets added to an
        approved command. Services run as the same computer user as other
        programs. Their code can still read available files and credentials,
        including those of later turns.`,
      text`Each turn gets a temporary credential for model requests in
        place of the agent login. A member with a terminal or a program in
        the workspace's cloud computer can read it while that turn runs.
        Through ${productName}, that credential can use the login of the
        session, including an org login. It works while the turn runs,
        also from outside the cloud computer. A program that keeps running,
        such as a dev server or a program that the startup script starts,
        can also get the credentials of later turns. This includes the
        turns of sessions that other members start. Agent settings in the
        repository can make the agent send its model requests, with their
        content and the credential of the turn, to another address. A commit,
        the agent, or other code can change those settings. After Stop, a
        credential can start no new request. A request that still runs
        ends at the first check of its turn that answers after the turn
        ends. ${productName} checks every 15 seconds. While no check
        answers, the request can run to the end of its answer. If the login
        is removed or changed, the turn ends at its next model request. A
        turn on a personal login also ends there if its owner loses org
        access.`,
      text`The setting of your personal login does not change these risks.
        Work in an org only with people whom you trust with your logins.`,
      text`An automation runs an agent without a person, on a schedule or when
        a pull request opens, gets new commits, or merges. Each run starts
        a new workspace as the member who owns the automation. Its agent login
        follows the same rule as a new session of that member. Its GitHub
        token belongs to that member, so its pushes and pull requests show
        as that member.`,
      text`Only the owner of an automation changes it or turns it on. An admin
        can turn it off or delete it. When the owner leaves the org, the
        automation moves to the member who gets their workspaces. It stays
        off until that member turns it on. Later runs follow the same
        agent login rule and use that member's GitHub token.`,
      text`The owner can choose org secrets in Capabilities on the automation
        page. Every member sees the chosen secret names. Only the owner changes
        the choice. Each run workspace starts with these secrets pre-approved
        by the owner. Its agents can use them without a new request.`,
      text`These pre-approvals stay in a kept run workspace until a member
        removes them or the secret is deleted. Changing the automation's
        choice affects only later run workspaces. The member who added a
        chosen secret, or an admin, can replace its value. Later runs then
        use the new value. A request for another
        secret still waits for a member unless another approval allows it.
        Agents in a run workspace can also ask for commands on the owner's
        Mac.`,
      text`The run of an automation for a pull request reads that pull request,
        also the comments, reviews, and descriptions of other GitHub
        accounts. Such text can steer the agent while the run uses the
        session's agent login, the owner's GitHub token, and the org's
        env vars.
        It can also steer the agent to use the secrets that need no new
        approval, such as a secret for all agents or one chosen for the
        automation. The automation page warns every member about this risk
        when the automation has a pull request trigger and a chosen secret.
        Such text can also steer the agent to read and change work across
        the org, with that member's workspace tool rights.
        Messages follow the same session login rules.`,
      text`A tool message, an accepted late answer to a secret request,
        or an accepted watch wake can start a stopped workspace's cloud
        computer.
        The merge queue can also start the computer for an agent turn.
        The start follows the same checks as opening the workspace. ${productName}
        sets no limit on how many sessions or messages agents create.
        Repeated replies can spend agent logins and keep computers running.
        Use Stop in each affected session to end its turn.
        Stop also drops earlier watch wakes that the session has not
        accepted yet.`,
      text`Admins manage the members, repositories, scripts, env vars, and
        agent logins of the org.`,
      text`Every member can add secrets, and replace or delete the secrets
        that they added. In an active org, admins can replace and delete each secret, mark a
        secret for all agents, and reveal one value at a time. Every member
        can change what each workspace allows, such as its pre-approved
        secrets. The Mac access switch acts only on your own Mac.`,
    ),
  ],
}
