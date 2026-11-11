import {
  changeFile,
  runFileJob,
  runFileQueue,
  splitPick,
  uploadingFile,
  type DraftFile,
} from '../../app/draft-files'
import { sessionState } from './chat-snapshot'
import type { ChatContext } from './context'
import { changeDraft, draftIdOf, holderOf } from './drafts'

/** An attached file of a draft, wherever the draft is now. */
function fileOf(
  context: ChatContext,
  draftId: string,
  fileId: string,
): DraftFile | undefined {
  const snapshot = context.store.get()
  const holder = holderOf(snapshot, draftId)
  if (holder === null) return undefined
  const { files } = sessionState(snapshot, holder).draft
  return files.find((item) => item.id === fileId)
}

/**
 * Uploads one file of a draft to the workspace. Its progress and its
 * outcome land on the file in the draft, also after the draft moved to
 * another session. Detachment and a stop of the chat abort the request, and a
 * reply that comes later changes nothing.
 */
async function upload(
  context: ChatContext,
  draftId: string,
  item: { id: string; file: File },
  job: AbortController,
): Promise<void> {
  try {
    await runFileJob({
      id: item.id,
      file: item.file,
      live: () =>
        context.live() &&
        context.uploads.get(item.id) === job &&
        !job.signal.aborted &&
        fileOf(context, draftId, item.id) !== undefined,
      signal: job.signal,
      change: (change) =>
        changeDraft(context, draftId, (draft) => ({
          ...draft,
          files: changeFile(draft.files, item.id, change),
        })),
      upload: (file, hooks) => context.api.upload(file, hooks),
    })
  } finally {
    if (context.uploads.get(item.id) === job) context.uploads.delete(item.id)
  }
}

/**
 * Attaches the files of one pick to the draft of a session. A file over the
 * size limit never uploads: its name goes to the notice of the draft, which
 * the next pick replaces. Each other file shows at once and uploads, one
 * after another. Returns their IDs immediately. Send waits until each is ready.
 */
export function attachFiles(
  context: ChatContext,
  sessionId: string,
  files: readonly File[],
): string[] {
  if (files.length === 0 || !context.live()) return []
  const draftId = draftIdOf(context, sessionId)
  const { uploads, refused } = splitPick(files)
  const added = uploads.map((file) => uploadingFile(context.newFileId(), file))
  const queued = added.map((item) => reserveUpload(context, draftId, item))
  changeDraft(context, draftId, (draft) => ({
    ...draft,
    files: [...draft.files, ...added],
    refused,
    sendId: added.length > 0 ? null : draft.sendId,
  }))
  void runFileQueue(queued)
  return added.map(({ id }) => id)
}

function reserveUpload(context: ChatContext, draftId: string, item: DraftFile) {
  const job = new AbortController()
  context.uploads.set(item.id, job)
  return () => upload(context, draftId, item, job)
}

/** Restarts only the uploads that a field change restored from undo. */
export function resumeFiles(
  context: ChatContext,
  draftId: string,
  files: readonly DraftFile[],
): void {
  const queued = files.map((item) => reserveUpload(context, draftId, item))
  void runFileQueue(queued)
}

/**
 * Try again uploads the kept `File` of a failed file again, with the same
 * ID. It works for a failed upload and for a file that the server no longer
 * has, such as one of an expired draft.
 */
export async function retryFile(
  context: ChatContext,
  sessionId: string,
  fileId: string,
): Promise<void> {
  const draftId = draftIdOf(context, sessionId)
  const item = fileOf(context, draftId, fileId)
  if (item?.state !== 'failed') return
  const start = reserveUpload(context, draftId, item)
  changeDraft(context, draftId, (draft) => ({
    ...draft,
    files: changeFile(draft.files, fileId, () =>
      uploadingFile(fileId, item.file),
    ),
    sendId: null,
  }))
  await start()
}
