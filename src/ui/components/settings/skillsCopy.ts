import type { ReadOnlyCause } from './readOnlyCause'

/**
 * What the lookup of the saved repository found on GitHub. The lookup runs
 * at Save and at each load of the section, and nothing stores its list.
 * `found` gives the names of the skill folders in name order, and
 * `incomplete` when GitHub cut the file tree of the repository short. An
 * empty list is a repository without skills. `private` and `not-found`
 * say why the repository gives no skills. `failed` is a lookup that did
 * not end, such as in a GitHub outage.
 */
export type SkillsLookup =
  | { result: 'found'; skills: readonly string[]; incomplete?: boolean }
  | { result: 'private' | 'not-found' | 'failed' }

/** Who views the section: an admin, or a person who cannot change it. */
export type SkillsViewer = 'admin' | ReadOnlyCause

/** A saved repository that gives no skills, with a notice in place of the list. */
export type NoSkillsCause = 'private' | 'not-found' | 'without-skills'

/** The title and the body of a notice. Backticks in a body mark code. */
export type SkillsNoticeText = { title: string; body: string }

/**
 * The words of the Skills section of the Cloud computer tab. The section
 * names one public GitHub repository, and the agents of every workspace of
 * the org use its skills. The cloud computer copies the repository when it
 * starts and then checks it for new commits every 5 minutes, so a running
 * workspace stays current. A changed repository applies at the next start
 * of each workspace, as a changed env var does. The words live here so
 * that the app shell and the members UI can share them with the mockups.
 */
export const skillsCopy = {
  title: 'Skills',
  description:
    'Agents in every workspace use the skills of a GitHub repository, and get its updates within minutes. The repository must be public.',
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
  /** The spoken name of the list of skills. */
  list: 'Skills in the repository',
  /**
   * The note of a file tree that GitHub cut short. The cloud computer
   * copies the whole repository, so the agents get every skill.
   */
  incomplete:
    'The repository is too large to list in full. Agents still get all of its skills.',
  /** The notice of a lookup that did not end, with Try again. */
  failed: {
    title: 'The list of skills did not load',
    body: 'GitHub is not available right now.',
  },
}

/** The label over the list: how many skills the lookup found. */
export function skillCount(count: number): string {
  return count === 1 ? '1 skill' : `${count} skills`
}

/**
 * What each viewer can do about a private repository, or about one that
 * GitHub does not find. An admin changes the field. A member reads who can
 * act. In a suspended org nobody can, and the notice of the org says why.
 */
const recovery: Readonly<
  Record<'private' | 'not-found', Readonly<Record<SkillsViewer, string>>>
> = {
  private: {
    admin: 'Choose a public repository, then save.',
    member: 'An admin can choose a public repository.',
    suspended: '',
  },
  'not-found': {
    admin: 'Check the name, then save.',
    member: 'An admin can check the name.',
    suspended: '',
  },
}

/** The sentences of a body, without the empty ones. */
function sentences(...parts: readonly string[]): string {
  return parts.filter((part) => part !== '').join(' ')
}

/**
 * The notice in place of the list, for a saved repository that gives no
 * skills. GitHub answers "not found" also for a private repository that the
 * sign-in of the viewer cannot see, so that notice speaks of a public
 * repository. The notice of a repository without skills says where the
 * cloud computer looks for them, and it reads the same for each viewer.
 */
export function skillsNoticeText(props: {
  cause: NoSkillsCause
  repository: string
  viewer: SkillsViewer
}): SkillsNoticeText {
  const { repository, viewer } = props
  switch (props.cause) {
    case 'private':
      return {
        title: `${repository} is private`,
        body: sentences(
          'Agents get no skills from it.',
          recovery.private[viewer],
        ),
      }
    case 'not-found':
      return {
        title: `${repository} was not found`,
        body: sentences(
          'GitHub has no public repository with this name.',
          recovery['not-found'][viewer],
        ),
      }
    case 'without-skills':
      return {
        title: `${repository} has no skills yet`,
        body: 'Agents use each folder with a `SKILL.md` file in the `skills` folder of the repository, or at its top level.',
      }
  }
}
