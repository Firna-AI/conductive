import type { ChatData } from './types'

export const PROVIDER_STOP_START_KEY = 'chat:v1:provider-stop-start'
export const PROVIDER_STOP_START_ALARM = 'lifecycle:provider-stop'

export interface ProviderStopStart {
  senderId: string
  turnIds: string[]
  at: number
}

export class ProviderStopStarts {
  private readonly data: ChatData

  constructor(data: ChatData) {
    this.data = data
  }

  read(): Promise<ProviderStopStart | undefined> {
    return this.data.get(PROVIDER_STOP_START_KEY)
  }

  async queue(senderId: string, turnId: string, at: number): Promise<void> {
    const previous = await this.read()
    await this.data.put(PROVIDER_STOP_START_KEY, {
      senderId: previous?.senderId ?? senderId,
      turnIds: [...new Set([...(previous?.turnIds ?? []), turnId])],
      at: previous?.at ?? at,
    })
    await this.data.put(
      `alarm:${PROVIDER_STOP_START_ALARM}`,
      previous?.at ?? at,
    )
  }
}
