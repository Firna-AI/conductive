import { constants } from 'node:fs'
import { open, readlink, type FileHandle } from 'node:fs/promises'
import { basename } from 'node:path'

import type { SkillReadOutcome } from './generated/SkillReadOutcome'

/** The tab and the workspace skill file reader limit text to 1 MiB. */
export const SKILL_FILE_MAX_BYTES = 1_048_576

type SkillReadFailure = Extract<SkillReadOutcome, { ok: false }>
export type SkillFileSource = 'agent' | 'org'

export const SKILL_NOT_FOUND = {
  ok: false,
  error: { code: 'skill_not_found', message: 'The skill was not found.' },
} satisfies SkillReadOutcome

const SKILL_UNAVAILABLE = {
  ok: false,
  error: { code: 'skill_unavailable', message: 'The skill could not be read.' },
} satisfies SkillReadOutcome

export function skillReadFailure(error: unknown): SkillReadFailure {
  return typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error.code === 'ENOENT' || error.code === 'ENOTDIR')
    ? SKILL_NOT_FOUND
    : SKILL_UNAVAILABLE
}

function tooLarge(sizeBytes: number, limitBytes: number): SkillReadFailure {
  return {
    ok: false,
    error: {
      code: 'skill_too_large',
      message: 'The skill is too large.',
      sizeBytes: Math.min(sizeBytes, Number.MAX_SAFE_INTEGER),
      limitBytes,
    },
  }
}

/** Apply the limit to the UTF-8 text that the result carries. */
export function skillReadText(
  text: string,
  maxBytes: number,
): SkillReadOutcome {
  const limit = Math.min(maxBytes, SKILL_FILE_MAX_BYTES)
  const size = Buffer.byteLength(text)
  return size > limit ? tooLarge(size, limit) : { ok: true, text }
}

/** Read a regular skill file within the limit, even when the file grows. */
export async function readSkillContent(
  path: string,
  maxBytes: number,
  source: SkillFileSource = 'agent',
  bodyOffset = 0,
): Promise<SkillReadOutcome> {
  const limit = Math.min(maxBytes, SKILL_FILE_MAX_BYTES)
  try {
    return await readRegularSkill(path, source, async (file, sizeBytes) => {
      if (sizeBytes > limit) return tooLarge(sizeBytes, limit)
      const buffer = Buffer.allocUnsafe(limit + 1)
      let size = 0
      while (size < buffer.length) {
        const { bytesRead } = await file.read(
          buffer,
          size,
          buffer.length - size,
        )
        if (bytesRead === 0) break
        size += bytesRead
      }
      if (size > limit)
        return tooLarge(Math.max(size, (await file.stat()).size), limit)
      return skillReadText(buffer.toString('utf8', bodyOffset, size), limit)
    })
  } catch (error) {
    return skillReadFailure(error)
  }
}

export async function readRegularSkill<T>(
  path: string,
  source: SkillFileSource,
  read: (file: FileHandle, sizeBytes: number) => Promise<T>,
): Promise<T | SkillReadFailure> {
  const file = await open(path, constants.O_RDONLY | constants.O_NONBLOCK)
  try {
    const info = await file.stat()
    if (!info.isFile()) return SKILL_UNAVAILABLE
    if (source === 'agent') {
      const target = await readlink(`/proc/self/fd/${file.fd}`).catch(() => '')
      if (basename(target) !== 'SKILL.md') return SKILL_UNAVAILABLE
    }
    return await read(file, info.size)
  } finally {
    await file.close()
  }
}

const READ_CHUNK_BYTES = 64 * 1024
const LINE_FEED = 10
const FRONT_MATTER_DELIMITER = /^---[^\S\n]*$/u

/** Read through the closing delimiter and give the byte offset of the body. */
export function readSkillHeader(path: string, source: SkillFileSource) {
  return readRegularSkill(path, source, async (file, sizeBytes) => {
    let opened = false
    const header: string[] = []
    for await (const { line, end } of skillLines(file, 0, sizeBytes, '---')) {
      if (!opened) {
        if (!FRONT_MATTER_DELIMITER.test(line)) break
        opened = true
      } else if (header.length && FRONT_MATTER_DELIMITER.test(line)) {
        return {
          ok: true as const,
          yaml: header.join('\n').replace(/\r$/u, ''),
          bodyOffset: end,
        }
      } else {
        header.push(line)
      }
    }
    return { ok: true as const, yaml: null, bodyOffset: 0 }
  })
}

export async function readFirstSkillLine(
  path: string,
  source: SkillFileSource,
  bodyOffset: number,
): Promise<SkillReadOutcome> {
  try {
    return await readRegularSkill(path, source, async (file, sizeBytes) => {
      for await (const { line } of skillLines(file, bodyOffset, sizeBytes))
        if (line.trim()) return { ok: true, text: line }
      return { ok: true, text: '' }
    })
  } catch (error) {
    return skillReadFailure(error)
  }
}

async function* skillLines(
  file: FileHandle,
  start: number,
  sizeBytes: number,
  prefix?: string,
) {
  let position = start
  let pending: Buffer[] = []
  while (position < sizeBytes) {
    const buffer = Buffer.allocUnsafe(
      Math.min(READ_CHUNK_BYTES, sizeBytes - position),
    )
    const { bytesRead } = await file.read(buffer, 0, buffer.length, position)
    if (bytesRead === 0) break
    const chunk = buffer.subarray(0, bytesRead)
    if (
      position === start &&
      prefix &&
      bytesRead >= prefix.length &&
      chunk.toString('utf8', 0, prefix.length) !== prefix
    )
      return
    let lineStart = 0
    for (
      let end = chunk.indexOf(LINE_FEED);
      end !== -1;
      end = chunk.indexOf(LINE_FEED, lineStart)
    ) {
      const tail = chunk.subarray(lineStart, end)
      const line = pending.length ? Buffer.concat([...pending, tail]) : tail
      yield { line: line.toString('utf8'), end: position + end + 1 }
      pending = []
      lineStart = end + 1
    }
    if (lineStart < bytesRead) pending.push(chunk.subarray(lineStart))
    position += bytesRead
  }
  if (pending.length)
    yield { line: Buffer.concat(pending).toString('utf8'), end: position }
}
