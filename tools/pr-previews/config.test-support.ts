import { checkSettings } from './settings.ts'
import { previewEnvironment } from './settings.test-support.ts'

export function configInputs() {
  const result = checkSettings({
    ...previewEnvironment(),
    CONDUCTIVE_FRAME_SOURCES: 'https://frames.example',
  })
  if (result.kind !== 'ready')
    throw new Error('The test settings are incomplete.')
  return {
    number: 123,
    databaseId: '00000000-0000-4000-8000-000000000123',
    runnerArchiveUrl: 'https://runner.preview.example/runner-test.tar.gz',
    runnerArchiveSha256: 'a'.repeat(64),
    settings: result.settings,
  }
}

export function buildConfig() {
  return {
    configPath: '/source/wrangler.jsonc',
    userConfigPath: '/source/wrangler.jsonc',
    topLevelName: 'conductive',
    definedEnvironments: [],
    keep_vars: true,
    compatibility_date: '2026-11-06',
    compatibility_flags: ['global_fetch_strictly_public'],
    jsx_factory: 'React.createElement',
    jsx_fragment: 'React.Fragment',
    rules: [{ type: 'ESModule', globs: ['**/*.js', '**/*.mjs'] }],
    name: 'conductive',
    main: 'index.js',
    routes: [{ pattern: 'app.conductive.build', custom_domain: true }],
    triggers: { crons: ['*/15 * * * *', '* * * * *'] },
    assets: {
      binding: 'ASSETS',
      not_found_handling: 'single-page-application',
      run_worker_first: true,
      directory: '../client',
    },
    workers_dev: false,
    preview_urls: false,
    vars: {
      MACHINE_ORIGIN: 'https://api.conductive.build',
      PREVIEW_DOMAIN: 'conductive.page',
      CONDUCTIVE_TITLE_MODEL: 'test-title-model',
      CONDUCTIVE_MODELS: '[{"agent":"codex","model":"test-model"}]',
      CONDUCTIVE_DEFAULT_CHOICE: '{"agent":"codex","model":"test-model"}',
      CONDUCTIVE_DEPLOY_TOKEN_SHA256: 'must-not-copy',
      FEEDBACK_EMAIL: 'must-not-copy@example.test',
      GITHUB_CLIENT_SECRET: 'fake-must-not-copy',
    },
    durable_objects: {
      bindings: [{ name: 'WORKSPACES', class_name: 'Workspace' }],
    },
    workflows: [],
    migrations: [
      { tag: 'v1', new_sqlite_classes: ['Workspace'] },
      { tag: 'v2', new_classes: ['NewClass'] },
    ],
    exports: {},
    kv_namespaces: [],
    cloudchamber: {},
    send_email: [],
    queues: { producers: [], consumers: [] },
    connect: [],
    r2_buckets: [
      { binding: 'CHAT_ATTACHMENTS', bucket_name: 'live-attachments' },
    ],
    d1_databases: [
      {
        binding: 'DB',
        database_name: 'conductive',
        database_id: 'live-id',
        migrations_dir: '../../migrations',
      },
    ],
    vectorize: [],
    ai_search_namespaces: [],
    ai_search: [],
    agent_memory: [],
    hyperdrive: [],
    services: [],
    analytics_engine_datasets: [],
    dispatch_namespaces: [],
    mtls_certificates: [],
    ai: { binding: 'AI' },
    pipelines: [],
    k2: [],
    secrets_store_secrets: [],
    artifacts: [],
    unsafe_hello_world: [],
    flagship: [],
    worker_loaders: [],
    ratelimits: [],
    vpc_services: [],
    vpc_networks: [],
    version_metadata: { binding: 'CF_VERSION_METADATA' },
    logfwdr: { bindings: [] },
    upload_source_maps: true,
    observability: {
      enabled: true,
      head_sampling_rate: 1,
      redact_query_string: true,
      issues: { enabled: true },
    },
    python_modules: { exclude: ['**/*.pyc'] },
    dev: { ip: 'localhost', generate_types: false },
    no_bundle: true,
  }
}
