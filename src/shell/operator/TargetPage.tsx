import { useEffect, useState } from 'react'
import { Ban, LockOpen } from 'lucide-react'
import { suspendedTitle } from '../../../docs/mockups/src/components/operator/operatorCopy'
import type { OperatorTarget } from '../../app/operator-target'
import { useStore, type Loadable } from '../../app/store'
import type { OperatorSuspension } from '../../shared/operator'
import { ActionButton } from '../ui/actions'
import { formatMoment } from './format'

/**
 * The question over a page: before a suspension or a lift, and on the page
 * of a user, before an approval or the disable of the referral code.
 */
export type Question = 'suspend' | 'lift' | 'approve' | 'disable-code'

/**
 * The action of a page: Suspend, or Lift for a suspended target. Desktop
 * shows it in the header, and a phone in the footer.
 */
export function TargetAction(props: {
  kind: 'org' | 'user'
  suspended: boolean
  ask: (question: Question) => void
}) {
  if (props.suspended) {
    return (
      <ActionButton
        icon={LockOpen}
        onPress={() => props.ask('lift')}
        tone="primary"
      >
        Lift suspension
      </ActionButton>
    )
  }
  return (
    <ActionButton icon={Ban} onPress={() => props.ask('suspend')} tone="danger">
      {props.kind === 'org' ? 'Suspend org' : 'Suspend user'}
    </ActionButton>
  )
}

/** The title of the notice of a suspension: when, and by which operator. */
export function suspensionTitle(
  suspension: OperatorSuspension,
  now: number,
  timeZone?: string,
): string {
  return suspendedTitle(
    formatMoment(suspension.suspendedAt, now, timeZone),
    suspension.operator?.login ?? null,
  )
}

/**
 * The page of one org or user. It reads the target each time it opens,
 * and keeps the question that shows over it.
 */
export function useTargetPage<Detail>(create: () => OperatorTarget<Detail>): {
  target: OperatorTarget<Detail>
  detail: Loadable<Detail>
  stopping: number | null
  question: Question | null
  ask: (question: Question | null) => void
} {
  const [target] = useState(create)
  const [question, ask] = useState<Question | null>(null)
  useEffect(() => target.detail.watch(), [target])
  return {
    target,
    detail: useStore(target.detail.value),
    stopping: useStore(target.stopping),
    question,
    ask,
  }
}
