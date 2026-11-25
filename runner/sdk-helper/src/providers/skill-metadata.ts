import { basename, join } from 'node:path'

import { stringify } from 'yaml'

import type { Agent } from '../generated/Agent'
import { readSkillHeader, type SkillFileSource } from '../skill-content'
import { readSkillSidecar, readSkillYaml, yamlRecord } from './skill-yaml'

export async function readSkillMetadata(
  folder: string,
  agent: Agent,
  source: SkillFileSource,
) {
  const path = join(folder, 'SKILL.md')
  const header = await readSkillHeader(path, source)
  return {
    ...skillMetadata(header.ok ? header.yaml : null, basename(folder), agent),
    path,
    file: header.ok
      ? { ok: true as const, bodyOffset: header.bodyOffset }
      : header,
  }
}

export type SkillMetadata = Awaited<ReturnType<typeof readSkillMetadata>>

function singleLine(value: unknown): string {
  return value == null ? '' : String(value).trim().replace(/\s+/gu, ' ')
}

export function isClaudeSkillAlias(value: string): boolean {
  return /^[A-Za-z0-9._-]+$/u.test(value)
}

function skillMetadata(yaml: string | null, folder: string, agent: Agent) {
  const frontmatter = yaml === null ? null : readSkillYaml(yaml, agent)
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
    frontmatter: safeFrontMatter(name, frontmatter ?? {}),
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

function safeFrontMatter(
  name: string | null,
  frontmatter: Record<string, unknown>,
) {
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
  return safe
}

export function safeSkillBody(
  body: string,
  agent: Agent,
  trustedClaudeBody: boolean,
) {
  // Insert separators. Removing ! can turn an inert !!` into a live !`.
  // Argument placeholders can expand to backticks after this filter runs.
  return agent === 'claude' && trustedClaudeBody
    ? body
    : body.replace(/!(?=[`$])/gu, '! ').replaceAll('```!', '``` !')
}

export function safeSkillContent(
  metadata: SkillMetadata,
  body: string,
  agent: Agent,
  trustedClaudeBody: boolean,
) {
  return `---\n${stringify(metadata.frontmatter)}---\n${safeSkillBody(body, agent, trustedClaudeBody)}`
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
