import type { Workspace } from './entry.test-support'
import { createOuterRuntime } from '../chat/integration/outer-runtime.test-support'
import { seedShellWorkspaceRuntime } from '../chat/integration/shell-api.test-support'
import {
  OUTER_WORKSPACE,
  OUTER_ORG,
  OUTER_SOFTWARE,
} from '../chat/integration/outer-seed.test-support'
import { insertBuild } from '../lifecycle/build-admission-data'
import { readSavedScript } from '../lifecycle/saved-script'
import { array } from '../chat/agent-events'
import { string } from '../chat/inputs'

export function featureState(value: unknown): Map<string, unknown> {
  return new Map(
    array(value, (entry): [string, unknown] => {
      const pair = array(entry, (item) => item)
      return [string(pair[0]), pair[1]]
    }),
  )
}

export async function featureFixture(
  bundle: string,
  options: Parameters<typeof createOuterRuntime>[1] = {},
) {
  const fixture = await createOuterRuntime(bundle, {
    ...options,
    configuration: { PREVIEW_DOMAIN: 'preview.test', ...options.configuration },
  })
  await seedShellWorkspaceRuntime(fixture)
  const bindings = await fixture.runtime.getBindings<{
    WORKSPACES: DurableObjectNamespace<Workspace>
  }>()
  return {
    ...fixture,
    actor: (id = OUTER_WORKSPACE) => bindings.WORKSPACES.getByName(id),
  }
}

export type FeatureFixture = Awaited<ReturnType<typeof featureFixture>>

export async function seedFeatureBuild(
  fixture: FeatureFixture,
  id: string,
  sandboxId: string,
): Promise<void> {
  await insertBuild(fixture.env.DB, {
    id,
    orgId: OUTER_ORG,
    kind: 'build',
    userId: 'owner',
    settingsRevision: 1,
    installScript: readSavedScript(''),
    repositories: [],
    repositoryLocations: [],
    previousRepositoryLocations: [],
    software: OUTER_SOFTWARE,
    previousImageName: 'outer-image',
    previousRunnerProtocolVersion: null,
    now: await fixture.actor(`org-image:${OUTER_ORG}`).testAlarmTime(),
  })
  await fixture.env.DB.batch([
    fixture.env.DB.prepare(
      'UPDATE image_builds SET sandbox_id = ? WHERE id = ?',
    ).bind(sandboxId, id),
    fixture.env.DB.prepare(
      "UPDATE image_build_jobs SET phase = 'software' WHERE build_id = ?",
    ).bind(id),
  ])
}
