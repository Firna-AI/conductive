import { useEffect, useMemo, useSyncExternalStore } from 'react'
import type { SkillsStore } from '../../../chat/mentions/mention-skills'
import type { FetchLike } from '../../../files/api/files-client'
import {
  errorFromThrown,
  failure,
  type FilesError,
  type FilesResult,
} from '../../../files/api/files-errors'
import { isObject, readCount, readString } from '../../../files/api/guards'
import {
  ResourceLoader,
  type Loaded,
} from '../../../files/model/resource-loader'
import { skillContentPath, type SkillIdentity } from '../../../shared/skills'

/**
 * Why a read of a skill failed, from the error that its reply names: a
 * skill that the list of its agent no longer holds is `not-found`, a text
 * over the limit is `too-large`, and each other error is `failed` with its
 * status and its code, such as `skill_reads_unsupported`.
 */
function skillError(status: number, body: unknown): FilesError {
  const error = isObject(body) && isObject(body.error) ? body.error : null
  const code = error ? readString(error, 'code') : null
  if (code === 'skill_not_found') return { kind: 'not-found' }
  if (error && code === 'skill_too_large') {
    const sizeBytes = readCount(error, 'sizeBytes')
    const limitBytes = readCount(error, 'limitBytes')
    if (sizeBytes !== null && limitBytes !== null) {
      return { kind: 'too-large', sizeBytes, limitBytes }
    }
  }
  return { kind: 'failed', status, code }
}

/**
 * Whether the cause of a failed read can pass: a reply with a 5xx status,
 * such as of a cloud computer that stops, or a fetch that failed, as when
 * the connection drops. A read of a text that shows keeps the text after
 * such a failure, as "Notices" in `docs/protocol/skill-tabs.md` says. A
 * reply with a 4xx status, such as of a removed skill, shows its notice.
 */
function causePasses(error: FilesError): boolean {
  return (
    error.kind === 'failed' && (error.status === null || error.status >= 500)
  )
}

/** Where a read of a skill goes: the fetch of the org, and the workspace. */
export interface SkillSource {
  fetch: FetchLike
  orgId: string
  workspaceId: string
}

/**
 * Reads the text of one skill of the workspace by its agent and its name.
 * It sends no path. It never throws: a failure is an error of the result.
 */
async function readSkillText(
  source: SkillSource,
  skill: SkillIdentity,
  signal: AbortSignal,
): Promise<FilesResult<string>> {
  try {
    signal.throwIfAborted()
    const response = await source.fetch(
      skillContentPath(source.orgId, source.workspaceId, skill),
      { headers: { Accept: 'application/json' }, signal },
    )
    const body: unknown = await response.json().catch((error: unknown) => {
      if (errorFromThrown(error).kind === 'aborted') throw error
      return null
    })
    signal.throwIfAborted()
    if (!response.ok) return failure(skillError(response.status, body))
    const text = isObject(body) ? readString(body, 'text') : null
    return text === null
      ? failure({ kind: 'failed', status: 200, code: 'invalid_response' })
      : { ok: true, value: text }
  } catch (thrown) {
    return failure(
      signal.aborted ? { kind: 'aborted' } : errorFromThrown(thrown),
    )
  }
}

/**
 * Reads the text of a skill while `follow` is on, and reads it again after
 * each skills report of the workspace, as "Fresh text" in
 * `docs/protocol/skill-tabs.md` says. A new read keeps the text that shows
 * until its reply, and after a failure whose cause can pass, as
 * `causePasses` says. With `follow` off, such as while the cloud computer
 * does not run, it reads nothing, and the state stays as the last read left
 * it. When `follow` turns on, such as when the workspace leaves Starting, it
 * reads at once. A reply for a skill that the page no longer shows never
 * shows.
 */
export function useSkillRead(
  source: SkillSource,
  skills: SkillsStore,
  skill: SkillIdentity,
  follow: boolean,
): { state: Loaded<string> | null; retry: () => void } {
  const { fetch, orgId, workspaceId } = source
  const { agent, name } = skill
  const key = JSON.stringify([agent, name])
  const loader = useMemo(
    () =>
      new ResourceLoader<string>(
        (_key, signal) =>
          readSkillText({ fetch, orgId, workspaceId }, { agent, name }, signal),
        causePasses,
      ),
    [fetch, orgId, workspaceId, agent, name],
  )
  useEffect(() => {
    if (!follow) return
    let reports = 0
    const read = () => loader.request(key, String(reports))
    read()
    const stop = skills.subscribe(() => {
      reports += 1
      read()
    })
    return () => {
      stop()
      loader.cancel()
    }
  }, [loader, key, follow, skills])
  const state = useSyncExternalStore(
    loader.subscribe,
    loader.getSnapshot,
    loader.getSnapshot,
  )
  return {
    state: state?.key === key ? state : null,
    retry: () => loader.retry(),
  }
}
