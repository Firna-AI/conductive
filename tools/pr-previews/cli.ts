type CommandResult =
  | { kind: 'written'; path: string }
  | { kind: 'skip'; warning: string }
  | { kind: 'help'; text: string }

const USAGE = `Usage: node tools/pr-previews/main.ts config \\
  --pr NUMBER --database-id ID --runner-url URL --runner-sha256 SHA256 \\
  [--build-config dist/conductive/wrangler.json]

The config command reads preview settings from the environment.
It prints the generated config path and deploys nothing.`

function configOptions(args: string[]) {
  try {
    return parseArgs({
      args,
      options: {
        pr: { type: 'string' },
        'database-id': { type: 'string' },
        'runner-url': { type: 'string' },
        'runner-sha256': { type: 'string' },
        'build-config': {
          type: 'string',
          default: 'dist/conductive/wrangler.json',
        },
      },
      strict: true,
      allowPositionals: false,
    }).values
  } catch {
    throw new Error('Invalid config arguments. Use --help for usage.')
  }
}

export async function runPreviewCommand(
  args: string[],
  environment: Readonly<Record<string, string | undefined>> = process.env,
): Promise<CommandResult> {
  const [command, ...options] = args
  if (command === undefined || command === '--help')
    return { kind: 'help', text: USAGE }
  switch (command) {
    case 'config': {
      const result = checkSettings(environment)
      if (result.kind === 'skip') return result
      if (result.kind === 'error') throw new Error(result.message)
      const values = configOptions(options)
      const pr = values.pr
      const databaseId = values['database-id']
      const runnerArchiveUrl = values['runner-url']
      const runnerArchiveSha256 = values['runner-sha256']
      if (!pr || !databaseId || !runnerArchiveUrl || !runnerArchiveSha256)
        throw new Error(
          'config requires --pr, --database-id, --runner-url, and --runner-sha256.',
        )
      if (!/^\d+$/.test(pr))
        throw new Error('Pull request number must be a positive safe integer.')
      const names = previewNames(Number(pr), result.settings.zone)
      const inputs: ConfigInputs = {
        number: names.number,
        databaseId,
        runnerArchiveUrl,
        runnerArchiveSha256,
        settings: result.settings,
      }
      return {
        kind: 'written',
        path: await writePreviewConfig(values['build-config'], inputs),
      }
    }
    default:
      throw new Error('Unknown preview command. Use --help for usage.')
  }
}
import { parseArgs } from 'node:util'
import { writePreviewConfig, type ConfigInputs } from './config.ts'
import { previewNames } from './names.ts'
import { checkSettings } from './settings.ts'
