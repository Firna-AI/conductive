import type { TestProject } from 'vitest/node'

import { buildNativeWorkspaceBundle } from './native-bundle'

export async function setup(project: TestProject): Promise<void> {
  const refresh = async () => {
    project.provide('nativeWorkspaceBundle', await buildNativeWorkspaceBundle())
  }
  await refresh()
  project.onTestsRerun(refresh)
}
