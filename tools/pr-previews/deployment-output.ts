import { appendFile } from 'node:fs/promises'

interface DeploymentOutput {
  marketingUrl: string
  appUrl: string
  dataReset: boolean
}

export class DeploymentFailure extends Error {
  readonly output: DeploymentOutput
  constructor(error: unknown, output: DeploymentOutput) {
    super(error instanceof Error ? error.message : 'Preview deployment failed.')
    this.output = output
  }
}

export function deploymentLines(output: DeploymentOutput): string[] {
  return [
    `Marketing: ${output.marketingUrl}`,
    `App: ${output.appUrl}`,
    `Data reset: ${output.dataReset}`,
  ]
}

export async function writeDeploymentOutput(
  output: DeploymentOutput,
  environment: Readonly<Record<string, string | undefined>>,
): Promise<void> {
  if (environment.GITHUB_OUTPUT)
    await appendFile(
      environment.GITHUB_OUTPUT,
      [
        `marketing_url=${output.marketingUrl}`,
        `app_url=${output.appUrl}`,
        `data_reset=${output.dataReset}`,
        '',
      ].join('\n'),
      'utf8',
    )
}
