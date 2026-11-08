export const GET_STARTED_PATH = '/api/get-started'

export type GetStartedStep = 'github-app' | 'org' | 'agent-login'

export interface GetStartedResponse {
  steps: readonly { step: GetStartedStep; complete: boolean }[]
  orgId: string | null
}
