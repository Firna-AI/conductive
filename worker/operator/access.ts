import type { AppEnv } from '../env'

export function isOperator(
  env: Pick<AppEnv, 'OPERATOR_GITHUB_IDS'>,
  githubId: number,
): boolean {
  const operators =
    env.OPERATOR_GITHUB_IDS?.split(',').map((id) => id.trim()) ?? []
  return operators.includes(String(githubId))
}
