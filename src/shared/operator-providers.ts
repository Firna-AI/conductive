export interface OperatorProvidersResponse {
  accounts: readonly { id: string; weight: number; orgs: number }[]
  updatedAt: number | null
  operator: { githubId: number; login: string } | null
}

export interface UpdateOperatorProvidersRequest {
  weights: Readonly<Record<string, number>>
}

export function operatorProvidersPath(): string {
  return '/api/operator/providers'
}
