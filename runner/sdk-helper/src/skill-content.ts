import { constants } from 'node:fs'
import { open } from 'node:fs/promises'

import type { SkillReadOutcome } from './generated/SkillReadOutcome'

/** The scan and the tab both limit skill files to 1 MiB. */
export const SKILL_FILE_MAX_BYTES = 1_048_576

export const SKILL_NOT_FOUND = {
  ok: false,
  error: { code: 'skill_not_found', message: 'The skill was not found.' },
} satisfies SkillReadOutcome

const SKILL_UNAVAILABLE = {
  ok: false,
  error: { code: 'skill_unavailable', message: 'The skill could not be read.' },
} satisfies SkillReadOutcome

export function skillReadFailure(error: unknown): SkillReadOutcome {
  return typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error.code === 'ENOENT' || error.code === 'ENOTDIR')
    ? SKILL_NOT_FOUND
    : SKILL_UNAVAILABLE
}

function tooLarge(sizeBytes: number, limitBytes: number): SkillReadOutcome {
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
    const file = await open(path, constants.O_RDONLY | constants.O_NONBLOCK)
    try {
      const info = await file.stat()
      if (!info.isFile()) return SKILL_UNAVAILABLE
      if (info.size > limit) return tooLarge(info.size, limit)
      const buffer = Buffer.allocUnsafe(limit + 1)
      let size = 0
      while (size < buffer.length) {
        const { bytesRead } = await file.read(
          buffer,
          size,
          buffer.length - size,
        )
        if (bytesRead === 0)
          return skillReadText(buffer.toString('utf8', 0, size), limit)
        size += bytesRead
      }
      return tooLarge(Math.max(size, (await file.stat()).size), limit)
    } finally {
      await file.close()
    }
  } catch (error) {
    return skillReadFailure(error)
  }
}
