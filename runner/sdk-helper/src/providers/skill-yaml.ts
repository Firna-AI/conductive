import { isScalar, parseDocument } from 'yaml'

import type { Agent } from '../generated/Agent'

export function yamlRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readYaml(source: string, agent?: Agent): unknown {
  const document = parseDocument(source, { logLevel: 'silent' })
  if (document.errors.length) throw document.errors[0]
  const value: unknown = document.toJS()
  if (agent === 'codex' && yamlRecord(value)) {
    for (const key of ['name', 'description']) {
      const node = document.get(key, true)
      if (isScalar(node) && ['number', 'boolean'].includes(typeof node.value))
        value[key] = node.source
    }
    const short = document.getIn(['metadata', 'short-description'], true)
    if (
      yamlRecord(value.metadata) &&
      isScalar(short) &&
      ['number', 'boolean'].includes(typeof short.value)
    )
      value.metadata['short-description'] = short.source
  }
  return value
}

function stringScalar(value: unknown): boolean {
  return (
    value == null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  )
}

function codexFields(value: unknown): boolean {
  if (!yamlRecord(value)) return false
  if (!stringScalar(value.name) || !stringScalar(value.description))
    return false
  return (
    value.metadata === undefined ||
    (yamlRecord(value.metadata) &&
      stringScalar(value.metadata['short-description']))
  )
}

// These retries follow Claude 2.1.318 and Codex 0.167.0's native readers.
function repairClaude(source: string): string {
  return source
    .split('\n')
    .map((line) => {
      const match = /^([a-zA-Z_-]+):\s+(\S.*)$/u.exec(line)
      if (!match) return line
      const [, key, value] = match
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      )
        return line
      if (value.startsWith('[') && value.endsWith(']')) {
        try {
          if (Array.isArray(readYaml(value))) return line
        } catch {
          // The native retry quotes an invalid flow scalar below.
        }
      }
      return /[{}[\]*&#!|>%@`]|: /u.test(value)
        ? `${key}: ${JSON.stringify(value)}`
        : line
    })
    .join('\n')
    .replace(/^\t+/gmu, (tabs) => '  '.repeat(tabs.length))
}

function repairCodex(source: string): string {
  let blockIndent: number | undefined
  return source
    .split('\n')
    .map((line) => {
      const indent = /^ */u.exec(line)?.[0].length ?? 0
      if (blockIndent !== undefined) {
        if (!line.trim() || indent > blockIndent) return line
        blockIndent = undefined
      }
      const match = /^([^:]+):(?=\s|$)(\s*)(.*)$/u.exec(line)
      if (!match || !match[1].trim()) return line
      const [, key, space, raw] = match
      const commentAt = /(^|\s)#/u.exec(raw)?.index
      const scalar = (
        commentAt === undefined ? raw : raw.slice(0, commentAt)
      ).trimEnd()
      const comment = commentAt === undefined ? '' : raw.slice(scalar.length)
      if (/^[|>]/u.test(scalar)) {
        blockIndent = indent
        return line
      }
      if (!scalar || /^['"]/u.test(scalar)) return line
      let invalidFlow = false
      if (/^[[{@`]/u.test(scalar)) {
        try {
          readYaml(scalar)
        } catch {
          invalidFlow = true
        }
      }
      return /:\s/u.test(scalar) || invalidFlow
        ? `${key}:${space}'${scalar.replaceAll("'", "''")}'${comment}`
        : line
    })
    .join('\n')
}

export function readSkillYaml(
  source: string,
  agent: Agent,
): Record<string, unknown> | null {
  const read = (text: string) => {
    const value = readYaml(text, agent)
    if (agent === 'codex' && !codexFields(value))
      throw new Error('Invalid Codex skill fields.')
    return yamlRecord(value) ? value : {}
  }
  try {
    return read(source)
  } catch {
    try {
      return read(
        agent === 'claude' ? repairClaude(source) : repairCodex(source),
      )
    } catch {
      return null
    }
  }
}

export function readSkillSidecar(source: string): Record<string, unknown> {
  try {
    const value = readYaml(source)
    return yamlRecord(value) ? value : {}
  } catch {
    return {}
  }
}
