import { HttpError } from '../http'
import type { ChatData } from './types'
import { CHAT_META } from './storage-keys'

export interface ChatMetadata {
  workspaceId: string
  through: number
  commandThrough: number
}

export async function readChatMetadata(
  data: ChatData,
  workspaceId: string,
): Promise<ChatMetadata> {
  const stored = await data.get<ChatMetadata>(CHAT_META)
  if (stored && stored.workspaceId !== workspaceId) {
    throw new HttpError(
      404,
      'workspace_not_found',
      'The workspace is not available.',
    )
  }
  return stored ?? { workspaceId, through: 0, commandThrough: 0 }
}
