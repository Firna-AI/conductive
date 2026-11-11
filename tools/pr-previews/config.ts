import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { buildMetadata, readBuildConfig } from './build-config.ts'
import { previewBindings } from './bindings.ts'
import { object, text } from './config-values.ts'
import { previewNames } from './names.ts'
import type { PreviewSettings } from './settings.ts'

export interface ConfigInputs {
  number: number
  databaseId: string
  runnerArchiveUrl: string
  runnerArchiveSha256: string
  settings: PreviewSettings
}

export function previewConfig(
  build: unknown,
  inputs: ConfigInputs,
): Record<string, unknown> {
  const names = previewNames(inputs.number, inputs.settings.zone)
  const problems: string[] = []
  const source = readBuildConfig(build, problems)
  const { upload_source_maps, observability, no_bundle, ...metadata } =
    buildMetadata(source, problems)
  const bindings = previewBindings(source, names, inputs.databaseId, problems)
  const variables = object(source.vars, 'vars', problems)
  const models = {
    CONDUCTIVE_TITLE_MODEL: text(
      variables.CONDUCTIVE_TITLE_MODEL,
      'vars.CONDUCTIVE_TITLE_MODEL',
      problems,
    ),
    CONDUCTIVE_MODELS: text(
      variables.CONDUCTIVE_MODELS,
      'vars.CONDUCTIVE_MODELS',
      problems,
    ),
    CONDUCTIVE_DEFAULT_CHOICE: text(
      variables.CONDUCTIVE_DEFAULT_CHOICE,
      'vars.CONDUCTIVE_DEFAULT_CHOICE',
      problems,
    ),
  }
  if (problems.length)
    throw new Error(
      `Invalid preview build configuration:\n- ${problems.join('\n- ')}`,
    )
  const settings = inputs.settings
  return {
    name: names.workerName,
    account_id: settings.accountId,
    ...metadata,
    assets: bindings.assets,
    workers_dev: false,
    preview_urls: false,
    keep_vars: false,
    vars: {
      ...models,
      APP_ORIGIN: names.appOrigin,
      MARKETING_ORIGIN: names.marketingOrigin,
      MACHINE_ORIGIN: names.machineOrigin,
      GITHUB_SETUP_RELAY_DOMAIN: names.zone,
      GITHUB_CLIENT_ID: settings.variables.GITHUB_CLIENT_ID,
      GITHUB_APP_SLUG: settings.variables.GITHUB_APP_SLUG,
      BOAT_ORG_ID: settings.variables.BOAT_ORG_ID,
      OPERATOR_GITHUB_IDS: settings.variables.OPERATOR_GITHUB_IDS,
      ...(settings.variables.CONDUCTIVE_FRAME_SOURCES === undefined
        ? {}
        : {
            CONDUCTIVE_FRAME_SOURCES:
              settings.variables.CONDUCTIVE_FRAME_SOURCES,
          }),
      CONDUCTIVE_RUNNER_ARCHIVE_URL: inputs.runnerArchiveUrl,
      CONDUCTIVE_RUNNER_ARCHIVE_SHA256: inputs.runnerArchiveSha256,
    },
    durable_objects: bindings.durable_objects,
    migrations: bindings.migrations,
    r2_buckets: bindings.r2_buckets,
    d1_databases: bindings.d1_databases,
    ai: bindings.ai,
    version_metadata: bindings.version_metadata,
    routes: [names.marketingHost, names.appHost, names.machineHost].map(
      (host) => ({
        pattern: `${host}/*`,
        zone_name: names.zone,
      }),
    ),
    upload_source_maps,
    observability,
    no_bundle,
  }
}

export async function writePreviewConfig(
  buildConfigPath: string,
  inputs: ConfigInputs,
): Promise<string> {
  const path = resolve(buildConfigPath)
  const contents = await readFile(path, 'utf8')
  let build: unknown
  try {
    build = JSON.parse(contents)
  } catch {
    throw new Error('Built Wrangler configuration must contain valid JSON.')
  }
  const config = previewConfig(build, inputs)
  const output = join(dirname(path), `wrangler.pr-${inputs.number}.json`)
  await writeFile(output, JSON.stringify(config, null, 2) + '\n', {
    encoding: 'utf8',
  })
  return output
}
