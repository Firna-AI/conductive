import { noRefusals, type IntakeRefusals } from '../../app/draft-files'
import {
  controlledUploads,
  uploadsSettled,
  withPickedFiles,
} from '../../app/draft-files.test-support'
import { chatFor } from './test-kit'

export function pickChatFiles(
  chat: ReturnType<typeof chatFor>,
  sessionId: string,
  files: readonly File[],
  refusals: IntakeRefusals = noRefusals,
): Promise<void> {
  const ids = chat.controller.attachFiles(sessionId, files, refusals)
  if (ids.length > 0) {
    chat.controller.setDraft(
      sessionId,
      withPickedFiles(chat.draftOf(sessionId)?.text ?? '', ids),
    )
  }
  return uploadsSettled(
    () =>
      Object.values(chat.controller.getSnapshot().sessionStates).flatMap(
        ({ draft }) => draft.files.filter(({ id }) => ids.includes(id)),
      ),
    chat.controller.subscribe,
  )
}

export async function readyChat() {
  const upload = controlledUploads()
  const chat = chatFor({ conversation: 'history', uploads: upload })
  await chat.controller.start()
  return { ...chat, ...upload }
}
