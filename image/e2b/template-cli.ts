import { spawn } from 'node:child_process'

export class TemplateBuildError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TemplateBuildError'
  }
}

export function templateEnvironment(
  environment: NodeJS.ProcessEnv,
): NodeJS.ProcessEnv {
  const apiKey = environment.E2B_API_KEY
  const domain = environment.E2B_DOMAIN
  if (!apiKey || !domain)
    throw new TemplateBuildError(
      'Set E2B_API_KEY and the selected EU E2B_DOMAIN.',
    )
  if (!/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/i.test(domain))
    throw new TemplateBuildError(
      'E2B_DOMAIN must be a domain without a URL path.',
    )
  const configured: NodeJS.ProcessEnv = {
    ...environment,
    E2B_API_KEY: apiKey,
    E2B_DOMAIN: domain,
    NO_UPDATE_NOTIFIER: '1',
  }
  delete configured.E2B_API_URL
  delete configured.E2B_SANDBOX_URL
  delete configured.E2B_DEBUG
  return configured
}

/** Provider output stays private. Only template-list JSON is returned to its parser. */
export function templateCli(
  arguments_: readonly string[],
  directory: string,
  environment: NodeJS.ProcessEnv,
  capture = false,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'npm',
      [
        'exec',
        '--yes',
        '--package=@e2b/cli@2.23.0',
        '--',
        'e2b',
        ...arguments_,
      ],
      { cwd: directory, env: environment, stdio: ['ignore', 'pipe', 'pipe'] },
    )
    let output = ''
    child.stdout.setEncoding('utf8')
    child.stdout.on('data', (chunk: string) => {
      if (capture) output += chunk
    })
    child.stderr.resume()
    child.once('error', () =>
      reject(new TemplateBuildError('The official E2B CLI could not start.')),
    )
    child.once('close', (code) => {
      if (code === 0) resolve(output)
      else
        reject(
          new TemplateBuildError(
            'The official E2B CLI failed. Check the project, region, and template build in the E2B console.',
          ),
        )
    })
  })
}
