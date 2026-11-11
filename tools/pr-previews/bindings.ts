import type { PreviewNames } from './names.ts'
import { fixed, list, object, onlyKeys, text, texts } from './config-values.ts'

function singleBinding(
  value: unknown,
  path: string,
  name: string,
  problems: string[],
) {
  const bindings = list(value, path, problems)
  if (bindings.length !== 1)
    problems.push(`${path} must contain only the ${name} binding.`)
  const binding = object(bindings[0], `${path}[0]`, problems)
  if (bindings.length === 1)
    fixed(binding.binding, name, `${path}[0].binding`, problems)
  return binding
}

function migrations(value: unknown, problems: string[]) {
  return list(value, 'migrations', problems).map((entry, index) => {
    const path = `migrations[${index}]`
    const migration = object(entry, path, problems)
    onlyKeys(
      migration,
      ['tag', 'new_classes', 'new_sqlite_classes'],
      path,
      problems,
    )
    return {
      tag: text(migration.tag, `${path}.tag`, problems),
      ...('new_classes' in migration
        ? {
            new_classes: texts(
              migration.new_classes,
              `${path}.new_classes`,
              problems,
            ),
          }
        : {}),
      ...('new_sqlite_classes' in migration
        ? {
            new_sqlite_classes: texts(
              migration.new_sqlite_classes,
              `${path}.new_sqlite_classes`,
              problems,
            ),
          }
        : {}),
    }
  })
}

export function previewBindings(
  build: Record<string, unknown>,
  names: PreviewNames,
  databaseId: string,
  problems: string[],
) {
  const assets = object(build.assets, 'assets', problems)
  onlyKeys(
    assets,
    ['binding', 'directory', 'not_found_handling', 'run_worker_first'],
    'assets',
    problems,
  )
  fixed(assets.binding, 'ASSETS', 'assets.binding', problems)
  fixed(assets.directory, '../client', 'assets.directory', problems)
  const db = singleBinding(build.d1_databases, 'd1_databases', 'DB', problems)
  onlyKeys(
    db,
    ['binding', 'database_name', 'database_id', 'migrations_dir'],
    'd1_databases[0]',
    problems,
  )
  fixed(
    db.migrations_dir,
    '../../migrations',
    'd1_databases[0].migrations_dir',
    problems,
  )
  const bucket = singleBinding(
    build.r2_buckets,
    'r2_buckets',
    'CHAT_ATTACHMENTS',
    problems,
  )
  onlyKeys(bucket, ['binding', 'bucket_name'], 'r2_buckets[0]', problems)
  const durable = object(build.durable_objects, 'durable_objects', problems)
  onlyKeys(durable, ['bindings'], 'durable_objects', problems)
  const objects = list(durable.bindings, 'durable_objects.bindings', problems)
  if (objects.length !== 1)
    problems.push(
      'durable_objects.bindings must contain only the WORKSPACES binding.',
    )
  const bindings = objects.map((value, index) => {
    const path = `durable_objects.bindings[${index}]`
    const binding = object(value, path, problems)
    onlyKeys(binding, ['name', 'class_name', 'script_name'], path, problems)
    if ('script_name' in binding)
      problems.push(`${path}.script_name cannot bind another Worker.`)
    fixed(binding.name, 'WORKSPACES', `${path}.name`, problems)
    fixed(binding.class_name, 'Workspace', `${path}.class_name`, problems)
    return { name: 'WORKSPACES', class_name: 'Workspace' }
  })
  const ai = object(build.ai, 'ai', problems)
  onlyKeys(ai, ['binding'], 'ai', problems)
  fixed(ai.binding, 'AI', 'ai.binding', problems)
  const version = object(build.version_metadata, 'version_metadata', problems)
  onlyKeys(version, ['binding'], 'version_metadata', problems)
  fixed(
    version.binding,
    'CF_VERSION_METADATA',
    'version_metadata.binding',
    problems,
  )
  return {
    assets: {
      binding: 'ASSETS',
      not_found_handling: text(
        assets.not_found_handling,
        'assets.not_found_handling',
        problems,
      ),
      run_worker_first: assets.run_worker_first === true,
      directory: '../client',
    },
    d1_databases: [
      {
        binding: 'DB',
        database_name: names.databaseName,
        database_id: databaseId,
        migrations_dir: '../../migrations',
      },
    ],
    r2_buckets: [
      {
        binding: 'CHAT_ATTACHMENTS',
        bucket_name: 'conductive-preview-attachments',
      },
    ],
    durable_objects: { bindings },
    ai: { binding: 'AI' },
    version_metadata: { binding: 'CF_VERSION_METADATA' },
    migrations: migrations(build.migrations, problems),
  }
}
