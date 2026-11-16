import type { ReadOnlyCause } from './OrgSections'

/**
 * The words of the Skills section of the Cloud computer tab. The section
 * names one GitHub repository, and the agents of every workspace of the
 * org use its skills. The cloud computer copies the repository when it
 * starts and then checks it for new commits every 5 minutes, so a running
 * workspace stays current. A changed repository applies at the next start
 * of each workspace, as a changed env var does. The words live here so
 * that the app shell and the members UI can share them with the mockups.
 */
export const skillsCopy = {
  title: 'Skills',
  description:
    'Agents in every workspace use the skills of a GitHub repository, and get its updates within minutes.',
  /** The label of the field, and the term of the read-only value. */
  label: 'Repository',
  /** The field also takes a link from GitHub, and saves it as owner/name. */
  placeholder: 'owner/repository',
  /** Under the field of an admin: when a changed repository applies. */
  hint: 'Changes here apply at the next start of each workspace.',
  save: 'Save repository',
  /**
   * The read-only section when the org has no repository. A member learns
   * who can choose one. In a suspended org nobody can, and its notice says
   * why.
   */
  empty: {
    member: 'An admin can choose one.',
    suspended: 'No repository chosen.',
  } satisfies Readonly<Record<ReadOnlyCause, string>>,
}
