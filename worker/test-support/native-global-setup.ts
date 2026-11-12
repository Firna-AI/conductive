import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import type { TestProject } from 'vitest/node'

import { buildMigrationTemplate } from './migration-template'
import { readMigrationScripts } from './migrations'
import { buildNativeWorkspaceBundle } from './native-bundle'

export async function setup(project: TestProject) {
  let root: string | undefined
  const remove = async () => {
    if (root) await rm(root, { recursive: true, force: true })
    root = undefined
  }
  const refresh = async () => {
    await remove()
    const run = await mkdtemp(join(tmpdir(), 'conductive-tests-'))
    root = run
    const bundles = join(run, 'bundles')
    const directory = join(run, 'storage')
    await Promise.all([mkdir(bundles), mkdir(directory)])
    const [bundle, scripts] = await Promise.all([
      buildNativeWorkspaceBundle(),
      readMigrationScripts(),
    ])
    const template = await buildMigrationTemplate(
      scripts,
      join(run, 'template'),
    )
    project.provide('nativeWorkspaceBundle', bundle)
    project.provide('migrationScripts', scripts)
    project.provide('testStorage', { template, directory })
    project.provide('testBundleDirectory', bundles)
  }
  await refresh()
  project.onTestsRerun(refresh)
  return remove
}
