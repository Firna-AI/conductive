import { createApp } from '../application'
import { fakeCodexTasks } from '../codex-auth/tasks.test-support'
import type { AppEnv } from '../env'
import { TEST_TIME } from '../test-support/harness'
import { sha256Hex } from './digest'
import { SOFTWARE_IMAGE_PATH } from './route'
import type { SoftwareImageRuntime } from './types'

export async function softwareImagePoll(runtime: SoftwareImageRuntime) {
  const token = 'deploy-poll-token'
  const digest = await sha256Hex(token)
  const env: AppEnv = {
    ...runtime.env,
    CONDUCTIVE_DEPLOY_TOKEN_SHA256: digest,
    CF_VERSION_METADATA: {
      id: 'worker-version',
      timestamp: new Date(TEST_TIME).toISOString(),
      tag: 'version',
    },
  }
  const app = createApp(runtime.dependencies)
  const tasks = fakeCodexTasks()
  return {
    tasks,
    request: () =>
      app.fetch(
        new Request(`${env.MACHINE_ORIGIN}${SOFTWARE_IMAGE_PATH}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ tokenDigest: digest }),
        }),
        env,
        tasks.execution,
      ),
  }
}

export function holdSoftwareImageRead(
  db: D1Database,
  wait: () => Promise<void>,
): D1Database {
  let first = true
  const statement = (prepared: D1PreparedStatement): D1PreparedStatement =>
    new Proxy(prepared, {
      get(target, property, receiver) {
        if (property === 'bind')
          return (...values: unknown[]) => statement(target.bind(...values))
        if (property === 'all')
          return async () => {
            if (first) {
              first = false
              await wait()
            }
            return target.all()
          }
        return Reflect.get(target, property, receiver)
      },
    })
  return new Proxy(db, {
    get(target, property, receiver) {
      if (property !== 'prepare') return Reflect.get(target, property, receiver)
      return (sql: string) =>
        sql.includes('FROM software_images')
          ? statement(target.prepare(sql))
          : target.prepare(sql)
    },
  })
}
