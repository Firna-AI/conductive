import { productName } from '../shared/brand'
import { paragraph, type LegalDocument } from './legal-text'

export const privacySkillsSection: LegalDocument['sections'][number] = {
  title: 'Org skills repositories',
  blocks: [
    paragraph`${productName} keeps the skills repository and trust
      choice that an org admin saves. It keeps repository text even
      when it does not name a public GitHub repository. Other members
      can read these settings. Trust applies to one repository and covers
      its future updates. Replacing or removing the repository clears
      trust unless an admin explicitly trusts the replacement. The
      settings stay until an admin changes them, or ${productName}
      deletes the org.`,
    paragraph`When an admin saves the repository, and each time the
      Skills section loads, ${productName} reads its repository details
      and file tree on GitHub. It uses the GitHub sign-in of the member
      who views the section. It shows the skill names or a notice.
      This lookup does not store the list it returns.`,
    paragraph`The cloud computer copies and updates the public repository
      without a GitHub token. GitHub receives the repository name and
      the network address with these requests. The copied skill folders
      guide agents powered by Claude and Codex in that workspace.`,
    paragraph`Trust lets Claude run commands automatically while it reads
      those skills. The commands have the workspace's access to files,
      available credentials, and tools. This choice does not change
      Codex's behavior.`,
    paragraph`Changed repository and trust settings apply when each
      cloud computer next starts or resumes. Saving does not change an
      active turn. A running computer can keep its previous
      trust while the repository copy gets new updates. After a
      repository change, the computer removes the old copy at that
      start or resume.`,
  ],
}
