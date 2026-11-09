type ProviderKind = 'boat'

export interface ProviderAccountConfiguration {
  readonly kind: ProviderKind
  readonly apiKey: string
  readonly orgId: string
}

export type ProviderAccountConfigurations = Readonly<
  Record<string, ProviderAccountConfiguration>
>

export class ProviderAccountError extends Error {
  readonly accountId: string

  constructor(accountId: string) {
    super('The sandbox provider account is not configured.')
    this.accountId = accountId
  }
}
