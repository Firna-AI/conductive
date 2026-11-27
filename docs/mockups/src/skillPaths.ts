import { plansSkill } from './fixtures/skills'

/**
 * The catalogue paths of the skill tab that screens link to: the tab in
 * Preview, in Source, and with each notice in place of the text. The row
 * with the kept skill tab and README.md in the temporary tab has two:
 * README.md shows, or the kept skill shows again.
 */
export const skillPaths = {
  preview: 'app/skill-mentions/tab',
  source: 'app/skill-mentions/tab/source',
  keptThenFile: 'app/skill-mentions/tab/temporary/kept',
  keptShown: 'app/skill-mentions/tab/temporary/return',
  loading: 'app/skill-mentions/tab/notices',
  gone: 'app/skill-mentions/tab/notices/gone',
  tooLarge: 'app/skill-mentions/tab/notices/too-large',
  olderSoftware: 'app/skill-mentions/tab/notices/older-software',
  failed: 'app/skill-mentions/tab/notices/failed',
} as const

/**
 * The skill tab that a press on a chip of the skill `name` opens, in the
 * message box and in a sent message, when the mockups draw its tab: the
 * tab of `plans` in Preview.
 */
export function skillTabOf(name: string): string | undefined {
  return name === plansSkill.name ? skillPaths.preview : undefined
}
