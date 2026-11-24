/**
 * The text of the skill `plans`, which its skill tab shows. It is the
 * `SKILL.md` of the Claude skill folder of the storefront repository.
 */

import type { Agent } from '../../../../src/shared/generated/Agent'
import type { MarkdownBlock } from './fileContents'
import { plansSkill } from './skills'

/**
 * The agent of the skill `plans` that the tab shows: its `SKILL.md` lies in
 * the Claude skill folder.
 */
export const plansAgent: Agent = 'claude'

/** The name of the file of a skill, which the Source view colours by. */
export const skillFileName = 'SKILL.md'

/**
 * The whole `SKILL.md` of `plans`, as the Source view shows it: the front
 * matter with the name and the description, then the Markdown body.
 */
export const plansSource = `---
name: ${plansSkill.name}
description: ${plansSkill.description}
---

# Plans

A plan is the spec of one change. It lives in \`plans/<name>.md\` until the pull request of the change deletes it.

## Before you write code

1. Read the protocol docs of the area that the change touches.
2. Write each decision with its options and the recommended option.
3. Ask for all decisions in one message, then wait for the answers.

## Milestones

- Put the mockups first, then the docs, then the code.
- Give each milestone its TODOs as check boxes.
- Tick a TODO only when its work is done and checked.

## After the answers

Record each answer and its date in the plan. Then start the first milestone.`

/**
 * The Markdown body of `plans`, without its front matter, already split
 * into blocks, as the Preview view shows it.
 */
export const plansBody: readonly MarkdownBlock[] = [
  { kind: 'h1', text: 'Plans' },
  {
    kind: 'p',
    text: 'A plan is the spec of one change. It lives in `plans/<name>.md` until the pull request of the change deletes it.',
  },
  { kind: 'h2', text: 'Before you write code' },
  {
    kind: 'ol',
    items: [
      'Read the protocol docs of the area that the change touches.',
      'Write each decision with its options and the recommended option.',
      'Ask for all decisions in one message, then wait for the answers.',
    ],
  },
  { kind: 'h2', text: 'Milestones' },
  {
    kind: 'ul',
    items: [
      'Put the mockups first, then the docs, then the code.',
      'Give each milestone its TODOs as check boxes.',
      'Tick a TODO only when its work is done and checked.',
    ],
  },
  { kind: 'h2', text: 'After the answers' },
  {
    kind: 'p',
    text: 'Record each answer and its date in the plan. Then start the first milestone.',
  },
]
