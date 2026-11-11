import { readFile, writeFile } from 'node:fs/promises'
import { afterEach, expect, it, vi } from 'vitest'
import { previewConfig, writePreviewConfig } from './config.ts'
import { buildConfig, configInputs } from './config.test-support.ts'

vi.mock('node:fs/promises', () => ({ readFile: vi.fn(), writeFile: vi.fn() }))
afterEach(() => vi.resetAllMocks())

const expectedPreview = {
  name: 'conductive-pr-123',
  account_id: '0123456789abcdef0123456789abcdef',
  main: 'index.js',
  compatibility_date: '2026-11-06',
  compatibility_flags: ['global_fetch_strictly_public'],
  jsx_factory: 'React.createElement',
  jsx_fragment: 'React.Fragment',
  rules: [{ type: 'ESModule', globs: ['**/*.js', '**/*.mjs'] }],
  triggers: { crons: ['*/15 * * * *', '* * * * *'] },
  assets: {
    binding: 'ASSETS',
    not_found_handling: 'single-page-application',
    run_worker_first: true,
    directory: '../client',
  },
  workers_dev: false,
  preview_urls: false,
  keep_vars: false,
  vars: {
    CONDUCTIVE_TITLE_MODEL: 'test-title-model',
    CONDUCTIVE_MODELS: '[{"agent":"codex","model":"test-model"}]',
    CONDUCTIVE_DEFAULT_CHOICE: '{"agent":"codex","model":"test-model"}',
    APP_ORIGIN: 'https://pr-123-app.preview.example',
    MARKETING_ORIGIN: 'https://pr-123.preview.example',
    MACHINE_ORIGIN: 'https://pr-123-api.preview.example',
    GITHUB_SETUP_RELAY_DOMAIN: 'preview.example',
    GITHUB_CLIENT_ID: 'fake-github-client',
    GITHUB_APP_SLUG: 'conductive-preview-test',
    BOAT_ORG_ID: 'fake-preview-org',
    OPERATOR_GITHUB_IDS: '123,456',
    CONDUCTIVE_FRAME_SOURCES: 'https://frames.example',
    CONDUCTIVE_RUNNER_ARCHIVE_URL:
      'https://runner.preview.example/runner-test.tar.gz',
    CONDUCTIVE_RUNNER_ARCHIVE_SHA256:
      'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  },
  durable_objects: {
    bindings: [{ name: 'WORKSPACES', class_name: 'Workspace' }],
  },
  migrations: [
    { tag: 'v1', new_sqlite_classes: ['Workspace'] },
    { tag: 'v2', new_classes: ['NewClass'] },
  ],
  r2_buckets: [
    {
      binding: 'CHAT_ATTACHMENTS',
      bucket_name: 'conductive-preview-attachments',
    },
  ],
  d1_databases: [
    {
      binding: 'DB',
      database_name: 'conductive-pr-123',
      database_id: '00000000-0000-4000-8000-000000000123',
      migrations_dir: '../../migrations',
    },
  ],
  ai: { binding: 'AI' },
  version_metadata: { binding: 'CF_VERSION_METADATA' },
  routes: [
    { pattern: 'pr-123.preview.example/*', zone_name: 'preview.example' },
    { pattern: 'pr-123-app.preview.example/*', zone_name: 'preview.example' },
    { pattern: 'pr-123-api.preview.example/*', zone_name: 'preview.example' },
  ],
  upload_source_maps: true,
  observability: {
    enabled: true,
    head_sampling_rate: 1,
    redact_query_string: true,
    issues: { enabled: true },
  },
  no_bundle: true,
}

it('keeps supported build capabilities and replaces live resources and variables', () => {
  const build = buildConfig()
  const before = structuredClone(build)
  expect(previewConfig(build, configInputs())).toEqual(expectedPreview)
  expect(build).toEqual(before)
})

it('names all unsupported bindings, remote objects, and unsafe migrations together', () => {
  const build = {
    ...buildConfig(),
    unknown_bindings: [],
    services: [{ binding: 'REMOTE', service: 'another-worker' }],
    durable_objects: {
      bindings: [
        {
          name: 'WORKSPACES',
          class_name: 'Workspace',
          script_name: 'another-worker',
        },
      ],
    },
    migrations: [
      {
        tag: 'v3',
        transferred_classes: [],
        renamed_classes: [],
        deleted_classes: [],
      },
    ],
  }
  expect(() => previewConfig(build, configInputs())).toThrowError(
    'Invalid preview build configuration:\n' +
      '- unknown_bindings is not an allowed build key.\n' +
      '- services cannot be served by the preview account.\n' +
      '- durable_objects.bindings[0].script_name cannot bind another Worker.\n' +
      '- migrations[0].transferred_classes is not allowed.\n' +
      '- migrations[0].renamed_classes is not allowed.\n' +
      '- migrations[0].deleted_classes is not allowed.',
  )
})

it('rejects unapproved binding names and paths outside the fixed build layout', () => {
  const build = buildConfig()
  const unsafe = {
    ...build,
    main: '../../untrusted.ts',
    assets: { ...build.assets, directory: '../../private' },
    d1_databases: [{ ...build.d1_databases[0], migrations_dir: '/private' }],
    ai: { binding: 'OTHER_AI' },
    r2_buckets: [
      ...build.r2_buckets,
      { binding: 'OTHER_BUCKET', bucket_name: 'private' },
    ],
  }
  expect(() => previewConfig(unsafe, configInputs())).toThrowError(
    'Invalid preview build configuration:\n' +
      '- main must be index.js.\n' +
      '- assets.directory must be ../client.\n' +
      '- d1_databases[0].migrations_dir must be ../../migrations.\n' +
      '- r2_buckets must contain only the CHAT_ATTACHMENTS binding.\n' +
      '- ai.binding must be AI.',
  )
})

it('writes valid preview JSON beside the built config', async () => {
  vi.mocked(readFile).mockResolvedValue(JSON.stringify(buildConfig()))
  await expect(
    writePreviewConfig(
      '/artifact/dist/conductive/wrangler.json',
      configInputs(),
    ),
  ).resolves.toBe('/artifact/dist/conductive/wrangler.pr-123.json')
  expect(readFile).toHaveBeenCalledExactlyOnceWith(
    '/artifact/dist/conductive/wrangler.json',
    'utf8',
  )
  const expected = JSON.stringify(expectedPreview, null, 2) + '\n'
  expect(writeFile).toHaveBeenCalledExactlyOnceWith(
    '/artifact/dist/conductive/wrangler.pr-123.json',
    expected,
    { encoding: 'utf8' },
  )
})

it('reports invalid build JSON without copying its contents into an error', async () => {
  vi.mocked(readFile).mockResolvedValue('fake-sensitive-value: invalid JSON')
  await expect(
    writePreviewConfig(
      '/artifact/dist/conductive/wrangler.json',
      configInputs(),
    ),
  ).rejects.toThrowError(
    'Built Wrangler configuration must contain valid JSON.',
  )
  expect(writeFile).not.toHaveBeenCalled()
})
