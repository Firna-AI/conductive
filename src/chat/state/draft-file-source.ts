import type { FieldFiles } from '../components/chip-field/attached-files'
import { retryFile } from './attachment-actions'
import { sessionState } from './chat-snapshot'
import type { ChatContext } from './context'
import { holderOf } from './drafts'

/** Reads the current holder of a draft, including during store notifications. */
export function draftFileSource(
  context: () => ChatContext,
  draftId: string,
  readOnly: () => boolean,
): FieldFiles {
  return {
    files: () => {
      const snapshot = context().store.get()
      const holder = holderOf(snapshot, draftId)
      if (holder === null) return []
      const { draft } = sessionState(snapshot, holder)
      return [...draft.files, ...draft.detached]
    },
    retry: (fileId) => {
      const current = context()
      const holder = holderOf(current.store.get(), draftId)
      if (holder !== null && !readOnly())
        void retryFile(current, holder, fileId)
    },
    subscribe: (listener) => context().store.subscribe(listener),
  }
}
