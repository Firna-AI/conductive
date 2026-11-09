import type { WorkspaceEvent } from '../chat/workspace-events'
import type { ChatData } from '../chat/types'

export class PreviewRevocations {
  private readonly data: Pick<ChatData, 'get' | 'put'>
  private readonly emit: (event: WorkspaceEvent) => Promise<unknown>

  constructor(
    data: Pick<ChatData, 'get' | 'put'>,
    emit: (event: WorkspaceEvent) => Promise<unknown>,
  ) {
    this.data = data
    this.emit = emit
  }

  async revoke(previewId: string): Promise<void> {
    const key = `previews:revoked:${previewId}`
    if (await this.data.get<boolean>(key)) return
    await this.emit({ type: 'preview.revoked', previewId })
    await this.data.put(key, true)
  }
}
