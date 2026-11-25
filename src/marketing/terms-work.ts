import { productName } from '../shared/brand'
import { paragraph, type LegalDocument } from './legal-text'

/**
 * The section of the terms on your work: the chat history, the attached
 * files, the model requests, Archive, Continue, the repository change, the
 * move of a deleted base branch, and the rights in your content. The facts
 * come from the architecture and the protocol docs.
 */
export const termsWorkSection: LegalDocument['sections'][number] = {
  title: 'Your work',
  blocks: [
    paragraph`Your repositories, files, and agent sessions live in the
      cloud computers that ${productName} runs for your org.
      ${productName} keeps the chat history of each workspace, so that
      you can read it while the cloud computer is stopped.`,
    paragraph`A service is a named program that runs outside an agent turn.
      It keeps running after the agent replies and through crashes,
      updates, and restarts of the agent software. A cloud computer stop
      ends all services and discards their saved commands, settings, and
      logs. They do not restore themselves after a resume. Services and
      their previews never keep the computer running.`,
    paragraph`The cloud computer downloads a new attachment when the
      agent starts work on its message.
      A large text that you paste becomes an attached file.
      ${productName} keeps each attached file until the cloud
      computer of its workspace has it and its first start succeeds.
      It then deletes its own copy. The file stays in the cloud computer.
      ${productName} deletes an unsent file 7 days after you upload it.`,
    paragraph`When ${productName} passes on the model requests of a cloud
      computer, it keeps no copy of a request or of its answer.
      It writes no body or header value of them to its logs.`,
    paragraph`Archive stops a workspace's cloud computer and keeps it
      for 14 days. Members of an active org can restore it during
      those 14 days while its computer is kept. When the 14 days end, ${productName} deletes
      the cloud computer and its files. The workspace leaves the
      Archived group, the command palette, and the workspace counts of
      the org.
      Its read-only chat still opens through a direct link or a chat
      link.`,
    paragraph`${productName} keeps the removed workspace's chat history
      until the org is deleted. Removing the workspace from the list
      does not delete this data.`,
    paragraph`Continue starts a new branch from the latest commit of the
      branch that the pull request merged into. If that branch no longer
      exists, it uses the repository's default branch. It keeps the
      cloud computer and its sessions.
      Changed files move to the new branch. Commits that are not pushed
      stay on their local branches.`,
    paragraph`A repository change moves a workspace to a new branch of
      another repository of the org. It keeps the cloud computer and
      its sessions. The old branch, its pull request, and the files in
      the folder of the old repository stay. The new repository's default
      branch becomes the workspace's base branch.`,
    paragraph`While a workspace branch has an open pull request, the
      workspace follows that pull request's base branch on GitHub. This
      includes changes that a member or GitHub makes there. If GitHub
      deletes the base branch while no pull request is open, ${productName}
      moves the base to the repository's default branch. A workspace that
      targets the default branch also follows changes to that default.`,
    paragraph`When an agent changes the base or the workspace follows a
      change on GitHub, the cloud computer fetches the new base.
      It uses the new base after the fetch succeeds. These fetches use
      the workspace owner's GitHub token. The same token serves automatic
      retries and resumes of stopped cloud computers. The token enters the
      cloud computer during the fetch.
      Programs and members with terminal access can read it while the
      fetch runs.`,
    paragraph`The agent actions in the pull request bar and Merge latest
      in the command palette send messages as the member who uses them.
      The chat history keeps these messages and a
      note that names who used Continue and the branches. It also keeps
      a note that names who changed the repository of a workspace, the
      new repository, and the new branch. It also keeps a note that names
      who changed the capabilities of a workspace, and what changed.`,
    paragraph`You keep any rights that you have in your repositories,
      files, messages, and other content. You give the operator
      permission to store, copy, process, and transmit that content as
      needed to provide the service, including through its providers.
      You must have permission to submit that content.`,
    paragraph`If you send feedback, you give the operator permission to
      use it to improve ${productName}, without any obligation to you.`,
    paragraph`The terms and licences of third-party code and services
      still apply. Check agent output before you use or publish it.`,
  ],
}
