import { skills as sampleSkills } from '../../../docs/mockups/src/fixtures/skills'
import { devTree } from '../../files/dev/dev-fixtures'
import type { SkillLists } from '../../shared/skills'
import type { MentionSkills } from '../mentions/mention-skills'
import type { ChatMentions } from '../mentions/MentionsContext'
import type { DevOptions } from './dev-options'

/**
 * The skill lists of the `skills` option. Claude has the skills of the
 * mockups. Codex has two of them and one of its own, so a change of the
 * model to Codex changes the rows.
 */
function devSkills(option: DevOptions['skills']): MentionSkills {
  if (option === 'loading') return { state: 'loading' }
  if (option === 'unavailable') return { state: 'unavailable' }
  const lists: SkillLists =
    option === 'none'
      ? { claude: [], codex: [] }
      : {
          claude: sampleSkills,
          codex: [
            ...sampleSkills.filter((skill) =>
              ['plans', 'testing'].includes(skill.name),
            ),
            {
              name: 'codex-review',
              description: 'Review the diff of the branch with Codex.',
            },
          ],
        }
  return { state: 'ready', lists }
}

/**
 * The files of the fake workspace, for the list of `@` and the file chips:
 * the tree of the Files development page, and the skill lists of the
 * `skills` option for the list of `/`. A press on a chip notes what the
 * app opens.
 */
export function devMentions(
  note: (line: string) => void,
  skills: DevOptions['skills'],
): ChatMentions {
  const tree = devTree()
  const snapshot = {
    tree: {
      entries: new Map(tree.entries.map((entry) => [entry.path, entry])),
    },
    treeError: null,
    treeUnavailable: false,
  }
  const skillSnapshot = devSkills(skills)
  return {
    files: { subscribe: () => () => undefined, getSnapshot: () => snapshot },
    skills: {
      subscribe: () => () => undefined,
      getSnapshot: () => skillSnapshot,
    },
    openFile: (path) => note(`The app opens ${path}.`),
    showFolder: (path) => note(`The app shows ${path}/ in All files.`),
    href: (entry) => `#${entry.path}`,
  }
}
