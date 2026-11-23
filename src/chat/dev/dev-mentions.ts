import { skills as sampleSkills } from '../../../docs/mockups/src/fixtures/skills'
import { createFilesClient } from '../../files/api/files-client'
import { devTree, registerDevFiles } from '../../files/dev/dev-fixtures'
import { createPictureReads } from '../../files/page/picture-reads'
import type { SkillLists } from '../../shared/generated/SkillLists'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import type { MentionSkills } from '../mentions/mention-skills'
import type { ChatMentions } from '../mentions/MentionsContext'
import type { DevOptions } from './dev-options'
import { registerDevShots } from './dev-pictures'

/**
 * How long each read of a picture takes, as a read over the network does,
 * so the box of its label shows before the picture.
 */
const readDelayMs = 2_500

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
 * the tree of the Files development page, with the screenshots of the
 * context folder, and the skill lists of the `skills` option for the list
 * of `/`. A press on a chip notes what the app opens.
 */
export function devMentions(
  note: (line: string) => void,
  skills: DevOptions['skills'],
): ChatMentions {
  const server = new FakeApiServer()
  registerDevFiles(server)
  const shots = registerDevShots(server)
  const client = createFilesClient({
    fetch: async (input, init) => {
      await new Promise((resolve) => setTimeout(resolve, readDelayMs))
      return server.fetch(input, init)
    },
    orgId: FAKE_IDS.org,
    workspaceId: FAKE_IDS.workspace,
  })
  const tree = devTree()
  const snapshot = {
    tree: {
      entries: new Map(
        [...tree.entries, ...shots].map((entry) => [entry.path, entry]),
      ),
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
    pictures: createPictureReads(client),
    openFile: (path, lines) =>
      note(
        lines
          ? `The app opens ${path} at lines ${lines.start} to ${lines.end}.`
          : `The app opens ${path}.`,
      ),
    showFolder: (path) => note(`The app shows ${path}/ in All files.`),
    href: (entry) => `#${entry.path}`,
  }
}
