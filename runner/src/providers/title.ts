import type { ProviderOptions } from './types'
import type { ProviderLifetime } from './lifetime'

export interface TitleRequestOptions extends Pick<
  ProviderOptions,
  'cwd' | 'home' | 'tools' | 'login' | 'choice'
> {
  text: string
  signal: AbortSignal
  lifetime: ProviderLifetime
}

export type TitleRequest = (options: TitleRequestOptions) => Promise<string>
