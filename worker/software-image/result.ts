import { SOFTWARE_IMAGE_FAILED } from './failure'
import type { SoftwareImage, SoftwareImageResult } from './types'

export function softwareImageResult(
  image: SoftwareImage,
  output: string,
): SoftwareImageResult {
  const { state, phase, version, error } = image
  return {
    state: state === 'deleting' ? 'failed' : state,
    phase,
    version,
    output,
    ...(state === 'failed'
      ? { error: error ?? SOFTWARE_IMAGE_FAILED, keptOutput: image.output }
      : {}),
  }
}
