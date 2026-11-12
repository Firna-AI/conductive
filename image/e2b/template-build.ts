import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { templateContext } from './template-context'
import {
  templateCli,
  templateEnvironment,
  TemplateBuildError,
} from './template-cli'

interface BuiltTemplate {
  templateId: string
  buildId: string
  cpuCount: number
  memoryMB: number
  diskSizeMB: number
  envdVersion: string
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function builtTemplate(output: string, name: string): BuiltTemplate {
  let list: unknown
  try {
    list = JSON.parse(output)
  } catch {
    throw new TemplateBuildError(
      'The E2B template list did not contain valid JSON.',
    )
  }
  if (!Array.isArray(list))
    throw new TemplateBuildError('The E2B template list has an invalid shape.')
  const matches = list.filter((value: unknown) => {
    if (!record(value)) return false
    return [value.names, value.aliases].some(
      (names) =>
        Array.isArray(names) &&
        names.some(
          (entry: unknown) =>
            typeof entry === 'string' &&
            entry.split(':', 1)[0].split('/').at(-1) === name,
        ),
    )
  })
  const value: unknown = matches[0]
  if (
    matches.length !== 1 ||
    !record(value) ||
    typeof value.templateID !== 'string' ||
    !value.templateID ||
    typeof value.buildID !== 'string' ||
    !value.buildID ||
    value.cpuCount !== 4 ||
    value.memoryMB !== 8192 ||
    typeof value.diskSizeMB !== 'number' ||
    !Number.isSafeInteger(value.diskSizeMB) ||
    value.diskSizeMB <= 0 ||
    typeof value.envdVersion !== 'string' ||
    !value.envdVersion
  )
    throw new TemplateBuildError(
      'The template list did not identify one build with 4 CPUs and 8192 MiB.',
    )
  return {
    templateId: value.templateID,
    buildId: value.buildID,
    cpuCount: value.cpuCount,
    memoryMB: value.memoryMB,
    diskSizeMB: value.diskSizeMB,
    envdVersion: value.envdVersion,
  }
}

function options(arguments_: readonly string[]) {
  let name = 'conductive-base'
  let prepare = false
  for (let index = 0; index < arguments_.length; index++) {
    const argument = arguments_[index]
    if (argument === '--prepare') prepare = true
    else if (argument === '--name') {
      name = arguments_[++index] ?? ''
      if (!name)
        throw new TemplateBuildError('Give a template name after --name.')
    } else
      throw new TemplateBuildError('Use --help to see the available options.')
  }
  return { name, prepare }
}

export async function buildTemplate(
  root: string,
  arguments_: readonly string[],
): Promise<void> {
  if (arguments_.includes('--help')) {
    process.stdout.write(
      'Usage: node image/e2b/build-template.mjs [--name conductive-base] [--prepare]\nBuilds an Ubuntu 24.04 template with 4 CPUs and 8192 MiB.\nSet E2B_API_KEY and the selected EU E2B_DOMAIN for a real build.\n--prepare stages public build inputs without installing a CLI or calling E2B.\nA real build uses @e2b/cli@2.23.0 through npm exec.\nStdout contains the actual template ID after a real build.\n',
    )
    return
  }
  const { name, prepare } = options(arguments_)
  const environment = prepare ? null : templateEnvironment(process.env)
  const directory = await templateContext(root)
  if (prepare) {
    process.stdout.write(
      `Prepared public template inputs under ${directory}.\nNo real template was built.\n`,
    )
    return
  }
  if (!environment)
    throw new TemplateBuildError('The template environment is missing.')
  process.stderr.write(
    'Building the E2B template. Provider output stays private.\n',
  )
  await templateCli(
    [
      'template',
      'create',
      name,
      '--path',
      directory,
      '--dockerfile',
      'Dockerfile',
      '--cpu-count',
      '4',
      '--memory-mb',
      '8192',
      '--ready-cmd',
      'systemctl is-active --quiet conductive-e2b-port-relay.service && test -S /run/conductive-e2b/relay.sock && systemctl is-active --quiet docker.service',
    ],
    directory,
    environment,
  )
  const built = builtTemplate(
    await templateCli(
      ['template', 'list', '--format', 'json'],
      directory,
      environment,
      true,
    ),
    name,
  )
  await writeFile(
    join(directory, 'build-result.json'),
    `${JSON.stringify({ name, domain: environment.E2B_DOMAIN, ...built }, null, 2)}\n`,
    { mode: 0o600 },
  )
  process.stdout.write(`${built.templateId}\n`)
}
