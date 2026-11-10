import { productName } from '../../docs/mockups/src/brand'
import { list, text, type LegalDocument } from './legal-text'

/**
 * The section of the terms on working in an org: the members, the logins of
 * the sessions, the GitHub tokens, and what a member or a program can read
 * in a cloud computer. It uses the newer and older cloud computers that the
 * Your accounts section of `terms.ts` defines. The facts come from the
 * architecture and the protocol docs.
 */
export const termsOrgSection: LegalDocument['sections'][number] = {
  title: 'Working in an org',
  blocks: [
    list(
      text`Every member of an org sees all of its workspaces, and can send
        messages in each of them.`,
      text`Each session runs on the agent login of the member who started
        it. The messages of other members use that login only when its
        owner allows it. Otherwise, the message of another member starts a
        new session on the login of that member. Each turn's git calls use
        a GitHub token of the member whose message started the turn.
        Pushes and pull requests show as that member. Outside an agent
        turn, the GitHub CLI uses the workspace owner's account.
        Each terminal connection uses that same account.`,
      text`That GitHub token reaches every repository where that person
        installed the GitHub App and has access, not only the
        repositories of the org.`,
      text`Each login that you connect has a setting that lets other
        members use it in the sessions that you start. For a Claude
        subscription or a ChatGPT sign-in, the setting starts off. For
        an API key, it starts on. When you replace a login with one of the
        same kind, the setting stays. You can change it on your account page. Share a
        login only when its provider's terms allow that use.`,
      text`Codex can use your ChatGPT plan through device code sign-in.
        ${productName} stores and renews that sign-in. OpenAI sends hosted
        apps to its sign-in waitlist and can block this use. OpenAI's terms
        forbid making your account available to anyone else. The real
        ChatGPT sign-in never enters a cloud computer. A computer that cannot
        use it fails the turn. Ask an admin to rebuild the org image, then
        start a new workspace. You can also connect an OpenAI API key.`,
      text`While a turn runs, its GitHub token is in the cloud computer of
        the workspace. A member with a terminal in that cloud computer can
        read it. A member with a terminal can also get the workspace
        owner's GitHub token without a running turn.`,
      text`In a newer cloud computer, each turn gets a credential in place
        of the agent login. A member with a terminal or a program in that
        cloud computer can read the credential of a turn that runs there.
        Through ${productName}, that credential can use the agent login of
        the member who started the session. It works while the turn runs,
        also from outside the cloud computer. A program that keeps running,
        such as a dev server or a program that the startup script starts,
        can also get the credentials of later turns. This includes the
        turns of sessions that other members start. Agent settings in the
        repository can make the agent send its model requests, with their
        content and the credential of the turn, to another address. A commit,
        the agent, or other code can change those settings. After Stop, a
        credential can start no new request. A request that still runs
        ends within 30 seconds after the turn ends. If the member who
        started the session removes or changes the login, or loses access
        to the org, the turn ends at its next model request.`,
      text`In an older cloud computer, the agent login itself can be in the
        cloud computer while a turn runs. A member with a terminal or a
        program in that cloud computer can read it. A program that a tool
        of the agent starts, such as a dev server, can keep the agent login
        after the turn ends. A member with a terminal can read it there
        too. Agent settings in the repository can make the agent send that
        login to another address. A commit, the agent, or other code can
        change those settings.`,
      text`The setting of your login does not change these risks. Work in
        an org only with people whom you trust with your logins.`,
      text`Admins manage the members, the repositories, the scripts, and
        the env vars of the org.`,
    ),
  ],
}
