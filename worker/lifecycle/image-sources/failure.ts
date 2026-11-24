import { transientProviderError } from '../provider-retry'

const IMAGE_SOURCE_STEPS = [
  'builder',
  'app_key',
  'repository_values',
  'metadata_token',
  'metadata_read',
  'source_token',
  'copy',
  'layout',
  'interrupted',
] as const

type ImageSourceStep = (typeof IMAGE_SOURCE_STEPS)[number]

export interface ImageSourceFailureDetails {
  sourceStep: ImageSourceStep | 'unknown'
  githubStatus: number | null
}

export function readImageSourceStep(
  value: unknown,
): ImageSourceFailureDetails['sourceStep'] {
  return IMAGE_SOURCE_STEPS.find((step) => step === value) ?? 'unknown'
}

export function readGitHubStatus(value: unknown): number | null {
  return typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 100 &&
    value <= 599 &&
    (value < 200 || value >= 300)
    ? value
    : null
}

export class ImageSourceStepError extends Error {
  readonly sourceStep: ImageSourceStep
  readonly githubStatus: number | null

  constructor(
    sourceStep: ImageSourceStep,
    githubStatus: number | null = null,
    message = 'The repository load failed',
  ) {
    super(message)
    this.sourceStep = sourceStep
    this.githubStatus = githubStatus
  }
}

export function sourceCommandFailure(
  error: unknown,
  step: 'copy' | 'layout' | 'interrupted',
): Error {
  return transientProviderError(error) ? error : new ImageSourceStepError(step)
}
