import type { ImageRuntime } from './image-builds'
import { insertBuild, finishUnscheduledBuild } from './build-admission-data'
import {
  failBuild,
  readBuildJob,
  runningBuild,
  jobSoftware,
} from './build-data'
import { readOrgSwitchContext } from '../operator/switch-context-data'
import {
  readOpenProviderSwitch,
  waitProviderSwitch,
  completeEmptyProviderSwitch,
} from './provider-switch-data'
import { switchBuildInputs } from './provider-switch-inputs'
import {
  firstActiveOrgAdmin,
  readRepositories,
  repositoriesWithSavedValues,
} from './settings-data'
import { capturedRepositoryLocations } from './repository-locations'
import { latestSoftwareRelease } from './software-release'
import { softwareVersion } from '../software-image/version'
import { SWITCH_STOPPED_BUILD } from './build-switch-admission'
import { repairEndedProviderSwitch } from './provider-switch-repair'

export async function progressProviderSwitch(
  runtime: ImageRuntime,
  orgId: string,
): Promise<boolean> {
  const { env, dependencies } = runtime
  const item = await readOpenProviderSwitch(env.DB, orgId)
  if (!item) return false
  if (
    item.state === 'building' &&
    (await repairEndedProviderSwitch(env.DB, item, dependencies.now()))
  )
    return (await readOpenProviderSwitch(env.DB, orgId)) !== null
  let context = await readOrgSwitchContext(env.DB, orgId)
  if (
    context.runningJob?.id === item.endRunningJobId &&
    item.state === 'waiting'
  ) {
    await failBuild(
      env.DB,
      context.runningJob.id,
      SWITCH_STOPPED_BUILD,
      dependencies.now(),
    )
    await finishUnscheduledBuild(env.DB, context.runningJob.id)
    context = await readOrgSwitchContext(env.DB, orgId)
  }
  if (context.runningJob) {
    if (context.runningJob.id !== item.buildId)
      await waitProviderSwitch(env.DB, item.id, 'job', context.runningJob.id)
    return true
  }
  const source = await switchBuildInputs(env.DB, orgId, context.providerAccount)
  if (!source) {
    await completeEmptyProviderSwitch(env.DB, item, dependencies.now())
    return false
  }
  if (context.waitReason) {
    await waitProviderSwitch(env.DB, item.id, context.waitReason)
    return true
  }
  const admin = await firstActiveOrgAdmin(env.DB, orgId)
  if (!admin) {
    await waitProviderSwitch(env.DB, item.id, 'admin')
    return true
  }
  const software = await latestSoftwareRelease(env, dependencies.fetch)
  const capturedRepositories = readRepositories(
    JSON.parse(source.repositoriesJson),
  )
  const repositories = await repositoriesWithSavedValues(
    env.DB,
    orgId,
    capturedRepositories,
  )
  const id = dependencies.randomToken()
  const inserted = await insertBuild(env.DB, {
    id,
    orgId,
    operatorSwitchId: item.id,
    sourceBuildId: source.buildId,
    providerAccount: item.toAccount,
    previousProviderAccount: item.toAccount,
    kind: 'build',
    userId: admin.userId,
    settingsRevision: source.settingsRevision,
    installScript: source.installScript,
    repositories,
    repositoryLocations: capturedRepositoryLocations(
      source.repositoryLocationsJson,
      capturedRepositories,
    ),
    previousRepositoryLocations: [],
    previousImageName: null,
    software,
    softwareVersion: await softwareVersion(software),
    now: dependencies.now(),
  })
  const active = inserted ? id : await runningBuild(env.DB, orgId)
  if (active) {
    const job = await readBuildJob(env.DB, orgId, active)
    await runtime.scheduler.schedule(
      orgId,
      jobSoftware(job),
      dependencies.now(),
      active,
      job.providerAccount,
    )
  }
  return true
}
