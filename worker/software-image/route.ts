import type { AppDependencies, AppEnv } from '../env'
import {
  latestSoftwareRelease,
  readSoftwareRelease,
} from '../lifecycle/software-release'
import { DEFAULT_PROVIDER_ACCOUNT } from '../sandbox/account-identity'
import { advanceSoftwareImage, requestSoftwareImage } from './build'
import { softwareImageForDeploy } from './data'
import { deployTokenDigest } from './deploy-gate'
import { boundedSoftwareImagePoll } from './poll'
import { softwareImageResult } from './result'

export const SOFTWARE_IMAGE_PATH = '/v1/deploy/software-image'

export async function handleSoftwareImage(
  request: Request,
  env: AppEnv,
  dependencies: AppDependencies,
  execution?: Pick<ExecutionContext, 'waitUntil'>,
): Promise<Response> {
  return boundedSoftwareImagePoll(
    env,
    dependencies,
    execution,
    async (runtime) => {
      const digest = await deployTokenDigest(request, env, dependencies.now())
      const image = await softwareImageForDeploy(
        env.DB,
        DEFAULT_PROVIDER_ACCOUNT,
        digest,
      )
      if (image) {
        if (image.state === 'failed' && image.tokenDigest !== digest)
          return requestSoftwareImage(
            runtime,
            readSoftwareRelease(JSON.parse(image.softwareJson)),
            digest,
          )
        const result = await advanceSoftwareImage(runtime, image.id, true)
        return softwareImageResult(result.image, result.output)
      }
      return requestSoftwareImage(
        runtime,
        await latestSoftwareRelease(env, runtime.dependencies.fetch),
        digest,
      )
    },
  )
}
