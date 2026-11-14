import { ATTACHMENT_PART_BYTES, type Attachment } from '../shared/messages'
import { FAKE_ORIGIN } from '../test-support/fixtures/core'
import { deferred } from '../test-support/mount'
import type { FetchLike, FileReply, FileTransport } from './api/client'
import { record, text } from './api/parse'
import { uploadRoutes } from './dev/attachment-parts'
import { ID, match } from './dev/router'
import { noRefusals, type DraftFile, type IntakeRefusals } from './draft-files'
import { draftParts, draftText } from './draft-marks'
import type { NewWorkspaceModel } from './new-workspace-model'
import { flushMicrotasks } from './test-kit'

/** The upload routes of both targets, for any org and workspace. */
const routes = [
  uploadRoutes(ID.org, { type: 'workspace', workspaceId: ID.workspace }),
  uploadRoutes(ID.org, { type: 'new-workspace', messageId: '' }),
]

/** The upload that a route of `kind` names in `path`, or null. */
function uploadOf(path: string, kind: 'part' | 'complete'): string | null {
  for (const paths of routes) {
    const params = match(paths[kind], path)
    if (params) return params.upload
  }
  return null
}

/** The reply of a part that the Worker refused, which goes out only once. */
export const refusedPart: FileReply = {
  status: 400,
  body: { error: { code: 'upload_failed', message: 'The upload failed.' } },
}

/**
 * Uploads whose parts wait for the test. Each file of a test is one part.
 * The fake answers the start call of each upload and its complete call, so
 * a chat takes `answer`, and a client of the app takes `fetch`. Each job is
 * one sent part, with the name of its file: a part starts only after the
 * start call answered, so `started` waits for it. `finish` gives the part
 * its receipt and the complete call the attachment with `id`. It returns
 * when that answer landed, or at once for a part that `signal` stopped.
 */
export function controlledUploads() {
  const jobs: {
    signal: AbortSignal
    progress: (bytes: number) => void
    name: string
    uploadId: string
    resolve: (reply: FileReply) => void
    reject: (error: Error) => void
  }[] = []
  const names = new Map<string, string>()
  const finished = new Map<string, Attachment>()
  const completions = new Map<string, () => void>()
  const waits: (() => void)[] = []
  let uploads = 0
  const answer = async (request: Request): Promise<Response | null> => {
    if (request.method !== 'POST') return null
    const path = new URL(request.url).pathname
    if (routes.some((paths) => match(paths.start, path))) {
      const body: unknown = await request.clone().json()
      const uploadId = `upload-${(uploads += 1)}`
      names.set(uploadId, text(record(body), 'name'))
      const partSizeBytes = ATTACHMENT_PART_BYTES
      return Response.json(
        { uploadId, partSizeBytes, partCount: 1 },
        { status: 201 },
      )
    }
    const uploadId = uploadOf(path, 'complete') ?? ''
    completions.get(uploadId)?.()
    completions.delete(uploadId)
    const done = finished.get(uploadId)
    return done ? Response.json({ attachment: done }, { status: 201 }) : null
  }
  const fetch =
    (next: FetchLike): FetchLike =>
    async (input, init) => {
      const recorded = await next(input, init)
      const request = new Request(new URL(input, FAKE_ORIGIN), init)
      return (await answer(request)) ?? recorded
    }
  const files: FileTransport = ({ path, signal, progress }) => {
    const reply = deferred<FileReply>()
    const uploadId = uploadOf(path, 'part') ?? ''
    const name = names.get(uploadId) ?? ''
    jobs.push({ signal, progress, name, uploadId, ...reply })
    for (const wake of waits.splice(0)) wake()
    return reply.promise
  }
  const started = async (count: number) => {
    while (jobs.length < count) {
      await new Promise<void>((resolve) => waits.push(resolve))
    }
  }
  const finish = async (
    index: number,
    id: string,
    path = `returned/${id}`,
    fields: Partial<Attachment> = {},
  ) => {
    const job = jobs[index]
    finished.set(job.uploadId, {
      id,
      path,
      name: job.name,
      kind: 'file',
      mediaType: 'text/plain',
      sizeBytes: 1,
      ...fields,
    })
    // A part that still goes on leads to the complete call. Only then can
    // its answer land, after the fake server answered that call.
    const answered = job.signal.aborted
      ? Promise.resolve()
      : new Promise<void>((resolve) => completions.set(job.uploadId, resolve))
    job.resolve({ status: 200, body: { partNumber: 1, etag: `etag-${index}` } })
    await answered
    await flushMicrotasks()
  }
  return { jobs, files, answer, fetch, started, finish }
}

export const note = (name = 'notes.txt') => new File(['x'], name)

export function withPickedFiles(text: string, ids: readonly string[]): string {
  if (ids.length === 0) return text
  return draftText([
    ...draftParts(text),
    ...(text !== '' && !/\s$/.test(text)
      ? [{ kind: 'text' as const, text: ' ' }]
      : []),
    ...ids.flatMap((id) => [
      { kind: 'file' as const, id },
      { kind: 'text' as const, text: ' ' },
    ]),
  ])
}

export async function uploadsSettled(
  read: () => readonly DraftFile[],
  subscribe: (listener: () => void) => () => void,
): Promise<void> {
  const waits = () => read().some(({ state }) => state === 'uploading')
  if (!waits()) return
  await new Promise<void>((resolve) => {
    const stop = subscribe(() => {
      if (waits()) return
      stop()
      resolve()
    })
  })
}

/** The refusals of a drop whose folders the browser could not read. */
export function unreadable(...folders: string[]): IntakeRefusals {
  return { tooLarge: [], folders }
}

export function pickWorkspaceFiles(
  model: NewWorkspaceModel,
  files: readonly File[],
  refusals: IntakeRefusals = noRefusals,
): Promise<void> {
  const ids = model.attach(files, refusals)
  if (ids.length > 0)
    model.setText(withPickedFiles(model.draft.get().text, ids))
  return uploadsSettled(() => model.draft.get().files, model.draft.subscribe)
}
