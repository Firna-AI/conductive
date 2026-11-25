import { constants } from 'node:fs'
import { open } from 'node:fs/promises'

import type { SkillReadOutcome } from './generated/SkillReadOutcome'

/** The scan and the tab both limit skill files to 1 MiB. */
export const SKILL_FILE_MAX_BYTES = 1_048_576

type SkillReadFailure = Extract<SkillReadOutcome, { ok: false }>

/** The bounded prefix and byte size of a regular file, or a read failure. */
export type SkillFileRead =
  { ok: true; text: string; sizeBytes: number } | SkillReadFailure

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
): Promise<SkillReadOutcome> {
  const limit = Math.min(maxBytes, SKILL_FILE_MAX_BYTES)
  try {
    return skillFileResult(await readRegularSkill(path, limit, false), limit)
  } catch (error) {
    return skillReadFailure(error)
  }
}

/** Read metadata from the first MiB, including for a file too large to show. */
export function readSkillPrefix(path: string): Promise<SkillFileRead> {
  return readRegularSkill(path, SKILL_FILE_MAX_BYTES, true)
}

/** Use the bytes already read to check the requested file limit. */
export function skillFileResult(
  file: SkillFileRead,
  maxBytes: number,
): SkillReadOutcome {
  if (!file.ok) return file
  const limit = Math.min(maxBytes, SKILL_FILE_MAX_BYTES)
  if (file.sizeBytes > limit) return tooLarge(file.sizeBytes, limit)
  return skillReadText(file.text, limit)
}

async function readRegularSkill(
  path: string,
  limit: number,
  keepPrefix: boolean,
): Promise<SkillFileRead> {
  const file = await open(path, constants.O_RDONLY | constants.O_NONBLOCK)
  try {
    const info = await file.stat()
    if (!info.isFile()) return SKILL_UNAVAILABLE
    if (info.size > limit && !keepPrefix) return tooLarge(info.size, limit)
    const buffer = Buffer.allocUnsafe(limit + 1)
    let size = 0
    while (size < buffer.length) {
      const { bytesRead } = await file.read(buffer, size, buffer.length - size)
      if (bytesRead === 0) break
      size += bytesRead
    }
    return {
      ok: true,
      text: buffer.toString('utf8', 0, Math.min(size, limit)),
      sizeBytes: size > limit ? Math.max(size, (await file.stat()).size) : size,
    }
  } finally {
    await file.close()
  }
}
