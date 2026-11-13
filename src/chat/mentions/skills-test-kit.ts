import { act } from 'react'
import type { AgentSkill, SkillLists } from '../../shared/skills'
import type { MentionSkills, SkillsStore } from './mention-skills'

// A store of the skill lists for the tests of the chat, with the three
// states that the shell store gives: loading, unavailable, and the lists.

export function skill(name: string, description = ''): AgentSkill {
  return { name, description }
}

/** The skills of the samples: each agent has its own, and one both have. */
export const sampleSkills: SkillLists = {
  claude: [
    skill('plans', 'Use before you write or change a plan file.'),
    skill('review', 'Review the diff of the branch.'),
    skill('playwright', 'Drive a browser to test the app.'),
    skill('git-commit', 'Use before you commit. Write the plans of a commit.'),
  ],
  codex: [
    skill('review', 'Review the diff with Codex.'),
    skill('codex-tests', 'Run the tests of the repository.'),
  ],
}

/** The lists of a report, `null` for an unavailable list, or no report yet. */
type FakeLists = SkillLists | null | 'loading'

function stateOf(lists: FakeLists): MentionSkills {
  if (lists === 'loading') return { state: 'loading' }
  if (lists === null) return { state: 'unavailable' }
  return { state: 'ready', lists }
}

/**
 * The skill lists of a workspace. `'loading'` means no report yet, `null`
 * an unavailable list, as `SkillsUpdated` gives them.
 */
export class FakeSkills implements SkillsStore {
  private snapshot: MentionSkills
  private readonly listeners = new Set<() => void>()

  constructor(lists: FakeLists = sampleSkills) {
    this.snapshot = stateOf(lists)
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getSnapshot = () => this.snapshot

  async set(lists: FakeLists): Promise<void> {
    await act(async () => {
      this.snapshot = stateOf(lists)
      this.listeners.forEach((listener) => listener())
    })
  }
}
