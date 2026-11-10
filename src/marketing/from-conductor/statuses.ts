import { productName } from '../../../docs/mockups/src/brand'
import type { ParityStatus } from './model'

type StatusMetadata = {
  readonly label: string
  readonly meaning: string
  readonly icon:
    | 'circle-check'
    | 'contrast'
    | 'circle-dashed'
    | 'arrow-right-left'
    | 'circle-ellipsis'
    | 'circle-minus'
  readonly tone: 'success' | 'warning' | 'active' | 'danger' | 'muted'
}

export const parityStatuses = {
  available: {
    label: 'Available',
    meaning: `Works in ${productName} today for users with app access.`,
    icon: 'circle-check',
    tone: 'success',
  },
  'in-progress': {
    label: 'In progress',
    meaning: 'Being built now.',
    icon: 'contrast',
    tone: 'warning',
  },
  planned: {
    label: 'Planned',
    meaning: 'Approved for future delivery or return.',
    icon: 'circle-dashed',
    tone: 'active',
  },
  different: {
    label: 'Works differently',
    meaning:
      'Users with app access can meet the same need through another design.',
    icon: 'arrow-right-left',
    tone: 'success',
  },
  considering: {
    label: 'Under consideration',
    meaning: 'No delivery commitment or decision to leave it out.',
    icon: 'circle-ellipsis',
    tone: 'muted',
  },
  'not-planned': {
    label: 'Not planned',
    meaning:
      'Left out by an explicit product decision. The note says what to do instead.',
    icon: 'circle-minus',
    tone: 'danger',
  },
} as const satisfies Readonly<Record<ParityStatus, StatusMetadata>>

export const statusOrder: readonly ParityStatus[] = [
  'available',
  'in-progress',
  'planned',
  'different',
  'considering',
  'not-planned',
]
