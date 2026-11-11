import { fixed, list, object, onlyKeys, text, texts } from './config-values.ts'

const EMPTY_ARRAY_KEYS = [
  'workflows',
  'kv_namespaces',
  'send_email',
  'connect',
  'vectorize',
  'ai_search_namespaces',
  'ai_search',
  'agent_memory',
  'hyperdrive',
  'services',
  'analytics_engine_datasets',
  'dispatch_namespaces',
  'mtls_certificates',
  'pipelines',
  'k2',
  'secrets_store_secrets',
  'artifacts',
  'unsafe_hello_world',
  'flagship',
  'worker_loaders',
  'ratelimits',
  'vpc_services',
  'vpc_networks',
] as const

const EMPTY_OBJECT_KEYS = ['exports', 'cloudchamber'] as const
const EMPTY_GROUPS = {
  queues: ['producers', 'consumers'],
  logfwdr: ['bindings'],
} as const

const BUILD_KEYS = [
  'configPath',
  'userConfigPath',
  'topLevelName',
  'definedEnvironments',
  'keep_vars',
  'compatibility_date',
  'compatibility_flags',
  'jsx_factory',
  'jsx_fragment',
  'rules',
  'name',
  'main',
  'routes',
  'triggers',
  'assets',
  'workers_dev',
  'preview_urls',
  'vars',
  'durable_objects',
  'migrations',
  'r2_buckets',
  'd1_databases',
  'ai',
  'version_metadata',
  'upload_source_maps',
  'observability',
  'python_modules',
  'dev',
  'no_bundle',
  ...EMPTY_ARRAY_KEYS,
  ...EMPTY_OBJECT_KEYS,
  ...Object.keys(EMPTY_GROUPS),
] as const

export function readBuildConfig(
  value: unknown,
  problems: string[],
): Record<string, unknown> {
  const build = object(value, 'build', problems)
  const allowed: readonly string[] = BUILD_KEYS
  for (const key of Object.keys(build)) {
    if (!allowed.includes(key))
      problems.push(`${key} is not an allowed build key.`)
  }
  for (const key of EMPTY_ARRAY_KEYS) {
    if (key in build && list(build[key], key, problems).length)
      problems.push(`${key} cannot be served by the preview account.`)
  }
  for (const key of EMPTY_OBJECT_KEYS) {
    if (key in build && Object.keys(object(build[key], key, problems)).length)
      problems.push(`${key} cannot be served by the preview account.`)
  }
  for (const [key, fields] of Object.entries(EMPTY_GROUPS)) {
    if (!(key in build)) continue
    const group = object(build[key], key, problems)
    onlyKeys(group, fields, key, problems)
    for (const field of fields) {
      if (
        field in group &&
        list(group[field], `${key}.${field}`, problems).length
      )
        problems.push(
          `${key}.${field} cannot be served by the preview account.`,
        )
    }
  }
  return build
}

export function buildMetadata(
  build: Record<string, unknown>,
  problems: string[],
) {
  fixed(build.main, 'index.js', 'main', problems)
  fixed(build.no_bundle, true, 'no_bundle', problems)
  const triggers = object(build.triggers, 'triggers', problems)
  onlyKeys(triggers, ['crons'], 'triggers', problems)
  const rules = list(build.rules, 'rules', problems).map((value, index) => {
    const path = `rules[${index}]`
    const rule = object(value, path, problems)
    onlyKeys(rule, ['type', 'globs'], path, problems)
    fixed(rule.type, 'ESModule', `${path}.type`, problems)
    const globs = texts(rule.globs, `${path}.globs`, problems)
    if (globs.some((glob) => glob !== '**/*.js' && glob !== '**/*.mjs'))
      problems.push(`${path}.globs must select only built JavaScript modules.`)
    return { type: 'ESModule', globs }
  })
  return {
    main: 'index.js',
    compatibility_date: text(
      build.compatibility_date,
      'compatibility_date',
      problems,
    ),
    compatibility_flags: texts(
      build.compatibility_flags,
      'compatibility_flags',
      problems,
    ),
    jsx_factory: text(build.jsx_factory, 'jsx_factory', problems),
    jsx_fragment: text(build.jsx_fragment, 'jsx_fragment', problems),
    rules,
    triggers: { crons: texts(triggers.crons, 'triggers.crons', problems) },
    upload_source_maps: build.upload_source_maps === true,
    observability: object(build.observability, 'observability', problems),
    no_bundle: true,
  }
}
