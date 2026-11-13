import type { LexicalNode } from 'lexical'
import type { AgentSkill } from '../../../shared/skills'
import { skillTextAt, type SkillText } from '../../../shared/skill-text'
import type { MentionSkills } from '../../mentions/mention-skills'
import { $createMentionTextNode } from './file-mention-nodes'
import {
  $insertPick,
  $reconcileChips,
  type MentionQuery,
} from './mention-content'
import {
  $createSkillMentionNode,
  $isSkillMentionNode,
  namedSkill,
} from './skill-mention-nodes'

/** A part of a text: plain text, or a skill text, as `skillTextAt` reads it. */
export type SkillTextPart = { kind: 'text'; text: string } | SkillText

/**
 * Splits a text into plain text and its skill texts, whether or not a list
 * names them. The field reads no code, as it reads no code for mentions.
 */
export function skillTextParts(text: string): SkillTextPart[] {
  const parts: SkillTextPart[] = []
  let plain = ''
  let index = 0
  while (index < text.length) {
    const skill = skillTextAt(text, index)
    if (skill === null) {
      plain += text[index]
      index += 1
      continue
    }
    if (plain !== '') parts.push({ kind: 'text', text: plain })
    plain = ''
    parts.push(skill)
    index += skill.source.length
  }
  if (plain !== '') parts.push({ kind: 'text', text: plain })
  return parts
}

/**
 * The node of a skill text of a paste or a draft: a chip when a list of
 * either agent names its skill, else text that can become a chip when a
 * list names it later.
 */
export function $skillNode(
  skill: SkillText,
  skills: MentionSkills,
): LexicalNode {
  return namedSkill(skills, skill.source)
    ? $createSkillMentionNode(skill.source)
    : $createMentionTextNode(skill.source)
}

/**
 * Brings the skill chips of the field in line with the lists of both
 * agents, as `$reconcileChips` says. Lists that load or that are
 * unavailable change nothing.
 */
export function $reconcileSkills(skills: MentionSkills): void {
  if (skills.state !== 'ready') return
  $reconcileChips({
    names: (source) => namedSkill(skills, source) !== undefined,
    isChip: $isSkillMentionNode,
    create: $createSkillMentionNode,
  })
}

/** Puts a chip of the skill in place of `/` and the query. */
export function $pickSkill(query: MentionQuery, skill: AgentSkill): void {
  $insertPick(query, $createSkillMentionNode(`/${skill.name}`))
}
