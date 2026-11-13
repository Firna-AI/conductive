import type { FileReply, FileTransport } from './api/client'
import { flushMicrotasks } from './test-kit'
import { deferred } from '../test-support/mount'
import { noRefusals, type DraftFile, type IntakeRefusals } from './draft-files'
import { draftParts, draftText } from './draft-marks'
import type { NewWorkspaceModel } from './new-workspace-model'

export function controlledUploads() {
  const jobs: {
    signal: AbortSignal
    progress: (bytes: number) => void
    name: string
    resolve: (reply: FileReply) => void
    reject: (error: Error) => void
  }[] = []
  const files: FileTransport = ({ file, signal, progress }) => {
    const reply = deferred<FileReply>()
    jobs.push({ signal, progress, name: file.name, ...reply })
    return reply.promise
  }
  const finish = async (index: number, id: string, path = `returned/${id}`) => {
    jobs[index].resolve({
      status: 201,
      body: {
        attachment: {
          id,
          path,
          name: jobs[index].name,
          kind: 'file',
          mediaType: 'text/plain',
          sizeBytes: 1,
        },
      },
    })
    await flushMicrotasks()
  }
  return { jobs, files, finish }
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
