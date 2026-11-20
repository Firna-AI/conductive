import {
  readSoftwareRelease,
  type SoftwareRelease,
} from '../lifecycle/software-release'
import {
  IMAGE_BUILD_TIME_LIMIT_MS,
  JobTimeLimit,
} from '../lifecycle/job-time-limit'
import { transientProviderError } from '../lifecycle/provider-retry'
import { DEFAULT_PROVIDER_ACCOUNT } from '../sandbox/account-identity'
import { providerForAccount } from '../sandbox/client'
import { retrySoftwareImageCleanup } from './cleanup'
import {
  insertSoftwareImage,
  latestSoftwareImage,
  readSoftwareImage,
  saveSoftwareImage,
  softwareImages,
} from './data'
import { AttemptChanged } from './resources'
import {
  SOFTWARE_IMAGE_FAILED,
  SOFTWARE_IMAGE_REPLACED,
  SOFTWARE_IMAGE_TIME_LIMIT,
} from './failure'
import { advanceSoftwareImageStep } from './steps'
import { associateSoftwareImageDeploy } from './deploy-data'
import { clearSoftwareImageOperation } from './operation-data'
import { claimSoftwareImageOutput } from './output-data'
import { softwareImageResult } from './result'
import type {
  SoftwareImage,
  SoftwareImageResult,
  SoftwareImageRuntime,
} from './types'
import { softwareVersion } from './version'

export async function advanceSoftwareImage(
  runtime: SoftwareImageRuntime,
  id: string,
  deliverOutput = false,
): Promise<{ image: SoftwareImage; output: string }> {
  let output = ''
  const checkpoint = async (final = false) => {
    while (deliverOutput && !runtime.poll?.stopped()) {
      const parts = await claimSoftwareImageOutput(runtime.env.DB, id)
      if (!parts.length) break
      if (runtime.poll) runtime.poll.output(parts)
      else output += parts.join('')
    }
    const image = await readSoftwareImage(runtime.env.DB, id)
    if (!image) throw new AttemptChanged()
    if (final || image.state === 'building')
      runtime.poll?.checkpoint(image, output)
    return { image, output }
  }
  for (;;) {
    const image = await readSoftwareImage(runtime.env.DB, id)
    if (!image) throw new AttemptChanged()
    if (image.state === 'building') await checkpoint()
    if (runtime.poll?.stopped()) return checkpoint(true)
    if (image.state !== 'building') {
      await retrySoftwareImageCleanup(runtime, image)
      return checkpoint(true)
    }
    try {
      let error: string | null = null
      if (
        (await softwareVersion(
          readSoftwareRelease(JSON.parse(image.softwareJson)),
        )) !== image.version
      )
        error = SOFTWARE_IMAGE_REPLACED
      else if (
        runtime.dependencies.now() >=
        image.startedAt + IMAGE_BUILD_TIME_LIMIT_MS
      )
        error = SOFTWARE_IMAGE_TIME_LIMIT
      if (error) {
        await saveSoftwareImage(runtime.env.DB, image, {
          state: 'failed',
          error,
          completedAt: runtime.dependencies.now(),
        })
        continue
      }
      const step = await advanceSoftwareImageStep(
        runtime,
        providerForAccount(
          runtime.env,
          runtime.dependencies.fetch,
          image.providerAccount,
        ),
        image,
      )
      if (step.wait) return checkpoint(true)
    } catch (error) {
      if (error instanceof AttemptChanged) continue
      if (transientProviderError(error)) {
        if (!runtime.poll?.expired())
          await clearSoftwareImageOperation(runtime.env.DB, image)
        return checkpoint(true)
      }
      const current = await readSoftwareImage(runtime.env.DB, id)
      if (current?.state === 'building' && current.phase === image.phase)
        await saveSoftwareImage(runtime.env.DB, current, {
          state: 'failed',
          error:
            error instanceof JobTimeLimit
              ? SOFTWARE_IMAGE_TIME_LIMIT
              : SOFTWARE_IMAGE_FAILED,
          completedAt: runtime.dependencies.now(),
        })
    }
  }
}

export async function requestSoftwareImage(
  runtime: SoftwareImageRuntime,
  artifact: SoftwareRelease,
  tokenDigest: string,
): Promise<SoftwareImageResult> {
  artifact = readSoftwareRelease(artifact)
  const version = await softwareVersion(artifact)
  const account = DEFAULT_PROVIDER_ACCOUNT
  for (;;) {
    for (const old of await softwareImages(runtime.env.DB, account)) {
      if (old.state !== 'building' || old.version === version) continue
      if (
        await saveSoftwareImage(runtime.env.DB, old, {
          state: 'failed',
          error: SOFTWARE_IMAGE_REPLACED,
          completedAt: runtime.dependencies.now(),
        })
      ) {
        if (runtime.poll?.stopped()) continue
        await retrySoftwareImageCleanup(runtime, {
          ...old,
          state: 'failed',
          error: SOFTWARE_IMAGE_REPLACED,
          revision: old.revision + 1,
        })
      }
    }
    let image = await latestSoftwareImage(runtime.env.DB, account, version)
    if (
      !image ||
      (image.state === 'failed' && image.tokenDigest !== tokenDigest)
    ) {
      await insertSoftwareImage(runtime.env.DB, {
        id: runtime.dependencies.randomToken(),
        account,
        version,
        artifact,
        tokenDigest,
        now: runtime.dependencies.now(),
      })
      image = await latestSoftwareImage(runtime.env.DB, account, version)
    }
    if (!image) continue
    if (
      runtime.poll &&
      !(await associateSoftwareImageDeploy(
        runtime.env.DB,
        tokenDigest,
        image.id,
        Date.parse(runtime.env.CF_VERSION_METADATA?.timestamp ?? '') +
          1_800_000,
      ))
    )
      continue
    try {
      const result = await advanceSoftwareImage(runtime, image.id, true)
      return softwareImageResult(result.image, result.output)
    } catch (error) {
      if (!(error instanceof AttemptChanged)) throw error
    }
  }
}
