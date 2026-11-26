import { basename } from 'node:path'

import { stringify } from 'yaml'

import type { Agent } from '../generated/Agent'
import { readSkillSidecar, readSkillYaml, yamlRecord } from './skill-yaml'

function singleLine(value: unknown): string {
  return value == null ? '' : String(value).trim().replace(/\s+/gu, ' ')
}

export function isClaudeSkillAlias(value: string): boolean {
  return /^[A-Za-z0-9._-]+$/u.test(value)
}

export function skillMetadata(content: string, path: string, agent: Agent) {
  const block = /^---[^\S\n]*\r?\n([\s\S]*?)\r?\n---[^\S\n]*(?:\r?\n|$)/u.exec(
    content,
  )
  const frontmatter = block ? readSkillYaml(block[1], agent) : null
  const folder = basename(path)
  let name: string | null
  if (agent === 'codex') {
    const candidate = singleLine(frontmatter?.name) || folder
    name =
      frontmatter &&
      singleLine(frontmatter.description) &&
      [...candidate].length <= 64
        ? candidate
        : null
  } else {
    const candidate = frontmatter?.name == null ? '' : String(frontmatter.name)
    name =
      candidate &&
      candidate.length <= 256 &&
      candidate.trim() === candidate &&
      !/[\p{C}<>]|[^\P{Z} ]/u.test(candidate)
        ? candidate
        : folder
  }
  return {
    name,
    aliases: name
      ? agent === 'claude' && isClaudeSkillAlias(folder)
        ? [folder, name]
        : [name]
      : [],
    frontmatter: frontmatter ?? {},
    body: block ? content.slice(block[0].length) : content,
  }
}

function scalar(value: unknown): value is string | number | boolean {
  return ['string', 'number', 'boolean'].includes(typeof value)
}

// Keep descriptions and invocation controls. Exclude execution, tool grants,
// model settings, and unknown keys; their meaning can change in an agent update.
const DESCRIPTIVE_FIELDS = [
  'description',
  'argument-hint',
  'disable-model-invocation',
  'user-invocable',
  'when_to_use',
  'version',
  'license',
  'compatibility',
] as const

export function safeSkillContent(
  content: string,
  path: string,
  agent: Agent,
  trustedClaudeBody = false,
) {
  const { name, frontmatter, body } = skillMetadata(content, path, agent)
  const safe: Record<string, unknown> = {}
  if (name) safe.name = name
  for (const key of DESCRIPTIVE_FIELDS)
    if (scalar(frontmatter[key])) safe[key] = frontmatter[key]
  const argumentsValue = frontmatter.arguments
  if (
    typeof argumentsValue === 'string' ||
    (Array.isArray(argumentsValue) &&
      argumentsValue.every((value: unknown) => typeof value === 'string'))
  )
    safe.arguments = argumentsValue
  const metadata = frontmatter.metadata
  if (yamlRecord(metadata) && scalar(metadata['short-description']))
    safe.metadata = { 'short-description': metadata['short-description'] }
  // Insert separators. Removing ! can turn an inert !!` into a live !`.
  // Argument placeholders can expand to backticks after this filter runs.
  const exportedBody =
    agent === 'claude' && trustedClaudeBody
      ? body
      : body.replace(/!(?=[`$])/gu, '! ').replaceAll('```!', '``` !')
  return `---\n${stringify(safe)}---\n${exportedBody}`
}

const INTERFACE_FIELDS = [
  'display_name',
  'short_description',
  'icon_small',
  'icon_large',
  'brand_color',
  'default_prompt',
] as const

export function safeSkillSidecar(content: string): string {
  const raw = readSkillSidecar(content)
  const safe: Record<string, unknown> = {}
  if (yamlRecord(raw.interface)) {
    const fields: Record<string, string> = {}
    for (const key of INTERFACE_FIELDS)
      if (typeof raw.interface[key] === 'string')
        fields[key] = raw.interface[key]
    safe.interface = fields
  }
  if (
    yamlRecord(raw.policy) &&
    typeof raw.policy.allow_implicit_invocation === 'boolean'
  )
    safe.policy = {
      allow_implicit_invocation: raw.policy.allow_implicit_invocation,
    }
  return stringify(safe)
}
