import type { ParityAreaKey } from './areas'

export type ParityStatus =
  | 'available'
  | 'in-progress'
  | 'planned'
  | 'different'
  | 'considering'
  | 'not-planned'

type FeatureBase = {
  readonly id: string
  readonly area: ParityAreaKey
  readonly name: string
  readonly note: string
}

export type ComingFeature = FeatureBase & {
  readonly status: 'in-progress' | 'planned'
  readonly due: string | null
}

type CurrentFeature = FeatureBase & {
  readonly status: Exclude<ParityStatus, ComingFeature['status']>
  readonly due?: never
}

export type ParityFeature = ComingFeature | CurrentFeature

export function isComing(feature: ParityFeature): feature is ComingFeature {
  return feature.status === 'in-progress' || feature.status === 'planned'
}
