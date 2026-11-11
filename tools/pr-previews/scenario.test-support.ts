import type { CommandRequest } from './operations.ts'
import {
  commandReply,
  d1Reply,
  fakeContext,
} from './operations.test-support.ts'
import { scenarioHttp } from './scenario-http.test-support.ts'

export interface ScenarioOptions {
  database?: boolean
  recorded?: { name: string; sha256: string }[]
  registryMissing?: boolean
  deployFailure?: boolean
  cleanupFailure?: boolean
  archiveMissing?: boolean
  migrationFailure?: boolean
  createFailure?: boolean
}

export function scenario(options: ScenarioOptions = {}) {
  const fake = fakeContext()
  const trace: string[] = []
  let exists = options.database ?? false
  let id = 'existing-database-id'
  fake.command.mockImplementation(async (request: CommandRequest) => {
    const args = request.args
    if (request.executable === 'aws') {
      if (args[0] === 's3api') {
        trace.push('runner:head')
        return options.archiveMissing
          ? { exitCode: 1, stdout: '', stderr: '(404) Not Found' }
          : commandReply({ ContentLength: 123 })
      }
      if (args[1] === 'cp') {
        trace.push('runner:upload')
        return commandReply({})
      }
      if (args[1] === 'rm') {
        trace.push('attachments:delete')
        return commandReply({})
      }
    }
    if (args[0] === 'deploy') {
      trace.push('worker:deploy')
      return {
        exitCode: options.deployFailure ? 1 : 0,
        stdout: '',
        stderr: 'fake-sensitive-output',
      }
    }
    if (args[0] !== 'd1') throw new Error('Unexpected fake command.')
    switch (args[1]) {
      case 'list':
        trace.push('database:list')
        return commandReply(
          exists ? [{ name: 'conductive-pr-123', uuid: id }] : [],
        )
      case 'create':
        trace.push('database:create')
        if (options.createFailure)
          return {
            exitCode: 1,
            stdout: '',
            stderr: 'fake-sensitive-create-error',
          }
        exists = true
        id = 'new-database-id'
        return commandReply({})
      case 'info':
        trace.push('database:info')
        return commandReply({ name: 'conductive-pr-123', uuid: id })
      case 'delete':
        trace.push('database:delete')
        exists = false
        return commandReply({})
      case 'migrations':
        trace.push('migrations:apply')
        if (options.migrationFailure)
          return {
            exitCode: 1,
            stdout: '',
            stderr: 'fake-sensitive-migration-error',
          }
        return commandReply({})
      case 'execute': {
        const sql = args[args.indexOf('--command') + 1]
        if (sql.includes("name = 'd1_migrations'")) {
          trace.push('migrations:applied-table')
          return d1Reply([{ name: 'd1_migrations' }])
        }
        if (sql === 'SELECT name FROM d1_migrations') {
          trace.push('migrations:applied')
          return d1Reply([{ name: '001.sql' }])
        }
        if (sql.includes("name IN ('orgs', 'image_builds')")) {
          trace.push('resources:known-tables')
          return d1Reply([{ name: 'orgs' }, { name: 'image_builds' }])
        }
        if (sql.includes("name = 'conductive_preview_migrations'")) {
          trace.push('migrations:table')
          return d1Reply(
            options.recorded ? [{ name: 'conductive_preview_migrations' }] : [],
          )
        }
        if (sql.startsWith('SELECT name, sha256')) {
          trace.push('migrations:read')
          return d1Reply(options.recorded ?? [])
        }
        if (
          sql.includes(
            'CREATE TABLE IF NOT EXISTS conductive_preview_migrations',
          )
        ) {
          trace.push('migrations:record')
          return d1Reply([])
        }
        if (sql === 'SELECT id FROM orgs') {
          trace.push('resources:orgs')
          return d1Reply([{ id: 'org-a' }])
        }
        if (sql.includes('pragma_table_info')) {
          trace.push('resources:tables')
          return d1Reply([{ name: 'image_builds' }])
        }
        if (sql.startsWith('SELECT snapshot_name')) {
          trace.push('resources:snapshots')
          return d1Reply([{ snapshot_name: 'stored-snapshot' }])
        }
        if (sql === 'SELECT id FROM image_builds') {
          trace.push('resources:builds')
          return d1Reply([{ id: 'a' }])
        }
      }
    }
    throw new Error('Unexpected fake SQL.')
  })
  fake.http.mockImplementation(scenarioHttp(trace, options))
  return { ...fake, trace }
}
