/**
 * The catalogue paths of the skill tab that screens link to: the tab in
 * Preview, in Source, and with each notice in place of the text.
 */
export const skillPaths = {
  preview: 'app/skill-mentions/tab',
  source: 'app/skill-mentions/tab/source',
  loading: 'app/skill-mentions/tab/notices',
  gone: 'app/skill-mentions/tab/notices/gone',
  tooLarge: 'app/skill-mentions/tab/notices/too-large',
  olderSoftware: 'app/skill-mentions/tab/notices/older-software',
} as const
