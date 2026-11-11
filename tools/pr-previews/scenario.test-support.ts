import { commandReply, fakeContext } from './operations.test-support.ts'
import { scenarioHttp } from './scenario-http.test-support.ts'
import { seedScenarioDatabase, traceSql } from './scenario-sql.test-support.ts'

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
  let seedExisting = options.database ?? false
  const fake = fakeContext(async (db) => {
    if (seedExisting) await seedScenarioDatabase(db, options)
  })
  const trace: string[] = []
  let exists = options.database ?? false
  let id = 'existing-database-id'
  fake.command.mockImplementation(async (request, sqlResult) => {
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
        seedExisting = false
        await fake.resetDatabase()
        return commandReply({})
      case 'migrations':
        trace.push('migrations:apply')
        if (options.migrationFailure) {
          const db = await fake.database()
          await db.batch([
            db.prepare(
              'CREATE TABLE d1_migrations (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)',
            ),
            db.prepare("INSERT INTO d1_migrations (name) VALUES ('001.sql')"),
          ])
          return {
            exitCode: 1,
            stdout: '',
            stderr: 'fake-sensitive-migration-error',
          }
        }
        return commandReply({})
      case 'execute': {
        const sql = args[args.indexOf('--command') + 1]
        traceSql(sql, trace)
        if (sqlResult) return sqlResult
      }
    }
    throw new Error('Unexpected fake SQL.')
  })
  fake.http.mockImplementation(scenarioHttp(trace, options))
  return { ...fake, trace }
}
