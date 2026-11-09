import {
  ArrowRightLeft,
  CircleCheck,
  CircleDashed,
  CircleEllipsis,
  CircleMinus,
  Contrast,
  type LucideIcon,
} from 'lucide-react'
import {
  parityAreas,
  parityFeatures,
  type ComingFeature,
  type ParityAreaKey,
  type ParityFeature,
  type ParityStatus,
} from '../../fixtures/conductorParity'
import { productName } from '../../brand'

/** The colour of a status mark. Its word always names the status too. */
type MarkTone = 'success' | 'active' | 'neutral' | 'muted'

type StatusWords = {
  /** The word of the status, such as "Available". */
  label: string
  /** The status in a count, such as "3 available", by its number. */
  counted: (count: number) => string
  /** What the status means, in a few words. */
  meaning: string
  icon: LucideIcon
  tone: MarkTone
}

/** The words, the icon, and the colour of each status. */
export const parityStatuses: Readonly<Record<ParityStatus, StatusWords>> = {
  available: {
    label: 'Available',
    counted: (count) => `${count} available`,
    meaning: `Works in ${productName} today.`,
    icon: CircleCheck,
    tone: 'success',
  },
  'in-progress': {
    label: 'In progress',
    counted: (count) => `${count} in progress`,
    meaning: 'Being built now.',
    icon: Contrast,
    tone: 'active',
  },
  planned: {
    label: 'Planned',
    counted: (count) => `${count} planned`,
    meaning: 'On the plan. Work has not started.',
    icon: CircleDashed,
    tone: 'active',
  },
  different: {
    label: 'Works differently',
    counted: (count) =>
      `${count} ${count === 1 ? 'works' : 'work'} differently`,
    meaning: `${productName} meets the same need in another way.`,
    icon: ArrowRightLeft,
    tone: 'neutral',
  },
  considering: {
    label: 'Under consideration',
    counted: (count) => `${count} under consideration`,
    meaning: 'No decision yet.',
    icon: CircleEllipsis,
    tone: 'muted',
  },
  'not-planned': {
    label: 'Not planned',
    counted: (count) => `${count} not planned`,
    meaning: 'Left out by design. The note says what to do instead.',
    icon: CircleMinus,
    tone: 'muted',
  },
}

/** The statuses in the order of the legend and of each count. */
export const statusOrder: readonly ParityStatus[] = [
  'available',
  'in-progress',
  'planned',
  'different',
  'considering',
  'not-planned',
]

/** The rule of the due days, as the legend and the lists state it. */
export const dueRule =
  'A due date is a commitment. A feature without a date has no date yet.'

/** Whether a feature is on the way, so that it can have a due day. */
export function isComing(feature: ParityFeature): feature is ComingFeature {
  return feature.status === 'in-progress' || feature.status === 'planned'
}

/** The title of an area, such as "Agents and chat". */
export function areaTitle(key: ParityAreaKey): string {
  return parityAreas.find((area) => area.key === key)?.title ?? key
}

/** The features of one area, in the order of the list. */
export function featuresOf(area: ParityAreaKey): readonly ParityFeature[] {
  return parityFeatures.filter((feature) => feature.area === area)
}

/** The features of the given statuses, in the order of the list. */
export function featuresWith(
  statuses: readonly ParityStatus[],
): readonly ParityFeature[] {
  return parityFeatures.filter((feature) => statuses.includes(feature.status))
}

/**
 * The features that are on the way: those with a due day first, the
 * soonest first, then those without one, in the order of the list.
 */
export function comingFeatures(): readonly ComingFeature[] {
  const coming = parityFeatures.filter(isComing)
  const dated = coming
    .filter((feature) => feature.due !== null)
    .sort((a, b) => (a.due ?? '').localeCompare(b.due ?? ''))
  return [...dated, ...coming.filter((feature) => feature.due === null)]
}

/** The counts of the statuses that the features have, in legend order. */
export function statusCounts(
  features: readonly ParityFeature[],
): readonly { status: ParityStatus; count: number }[] {
  return statusOrder
    .map((status) => ({
      status,
      count: features.filter((feature) => feature.status === status).length,
    }))
    .filter((entry) => entry.count > 0)
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
