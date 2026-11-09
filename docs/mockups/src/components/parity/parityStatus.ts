import {
  ArrowRightLeft,
  CircleCheck,
  CircleDashed,
  CircleEllipsis,
  CircleMinus,
  Contrast,
  type LucideIcon,
} from 'lucide-react'
import { productName } from '../../brand'
import {
  parityFeatures,
  type ComingFeature,
  type ParityAreaKey,
  type ParityFeature,
  type ParityStatus,
} from '../../fixtures/conductorParity'

/**
 * The colour of the icon of a status mark. The colour only supports the
 * status: its word and the shape of its icon always name it too.
 */
type MarkTone = 'success' | 'warning' | 'active' | 'danger' | 'muted'

type StatusWords = {
  /** The word of the status, such as "Available". */
  label: string
  /** What the status means, in a few words. */
  meaning: string
  icon: LucideIcon
  tone: MarkTone
}

/**
 * The words, the icon, and the colour of each status. Green marks a need
 * that the product meets today, in its own way or in Conductor's. Amber
 * marks work that is being built, blue a plan, red a feature that the
 * product leaves out, and grey a feature without a decision.
 */
export const parityStatuses: Readonly<Record<ParityStatus, StatusWords>> = {
  available: {
    label: 'Available',
    meaning: `Works in ${productName} today.`,
    icon: CircleCheck,
    tone: 'success',
  },
  'in-progress': {
    label: 'In progress',
    meaning: 'Being built now.',
    icon: Contrast,
    tone: 'warning',
  },
  planned: {
    label: 'Planned',
    meaning: 'On the plan. Work has not started.',
    icon: CircleDashed,
    tone: 'active',
  },
  different: {
    label: 'Works differently',
    meaning: `${productName} meets the same need in another way.`,
    icon: ArrowRightLeft,
    tone: 'success',
  },
  considering: {
    label: 'Under consideration',
    meaning: 'No decision yet.',
    icon: CircleEllipsis,
    tone: 'muted',
  },
  'not-planned': {
    label: 'Not planned',
    meaning: 'Left out by design. The note says what to do instead.',
    icon: CircleMinus,
    tone: 'danger',
  },
}

/** The statuses in the order of the legend. */
export const statusOrder: readonly ParityStatus[] = [
  'available',
  'in-progress',
  'planned',
  'different',
  'considering',
  'not-planned',
]

/** The rule of the due days, as the legend states it. */
export const dueRule =
  'A due date is a commitment. A feature without a date has no date yet.'

/** Whether a feature is on the way, so that it can have a due day. */
export function isComing(feature: ParityFeature): feature is ComingFeature {
  return feature.status === 'in-progress' || feature.status === 'planned'
}

/** The features of one area, in the order of the list. */
export function featuresOf(area: ParityAreaKey): readonly ParityFeature[] {
  return parityFeatures.filter((feature) => feature.area === area)
}

const longDay = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const shortDay = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

/**
 * The words of a day, such as "16 November 2026", or "16 Nov 2026" when
 * short. They come from the day alone, in UTC and in British English, so no
 * time zone or locale of the browser changes them.
 */
export function dayWords(day: string, length: 'long' | 'short'): string {
  const time = Date.parse(`${day}T00:00:00Z`)
  if (Number.isNaN(time)) return day
  return (length === 'long' ? longDay : shortDay).format(time)
}
