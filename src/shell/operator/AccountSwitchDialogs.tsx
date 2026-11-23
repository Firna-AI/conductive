import { useState } from 'react'
import { ArrowLeftRight, CircleAlert, CircleStop } from 'lucide-react'
import { SegmentedControl } from '@firna/ui/segmented'
import { Notice } from '../../ui/components/common/Notice'
import { useControlSizes } from '../../ui/components/common/touch'
import {
  endJobOffer,
  stopQuestion,
  stopTitle,
  switchQuestion,
  switchTitle,
  switchWaitLine,
  switchWords,
  type JobWait,
  type OrgSwitch,
  type SwitchWait,
} from '../../ui/components/operator/switchCopy'
import { ActionButton } from '../ui/actions'
import { Dialog, DialogText } from '../ui/Dialog'
import { CheckOption } from './CheckOption'
import { useQuestion } from './useQuestion'

/** A wait for a build or a refresh of the org, which the question can end. */
function isJobWait(wait: SwitchWait | undefined): wait is JobWait {
  return wait?.kind === 'build' || wait?.kind === 'refresh'
}

/**
 * The operator confirms a switch of the provider account of an org. With
 * one other configured account, the question names it. With more, it
 * offers each account other than the current one by its ID, the first one
 * chosen, and its title and its words follow the choice. It says that the
 * switch builds the cloud computer of the org again on the new account,
 * that new workspaces move when that build succeeds, and that existing
 * workspaces stay. When the build must wait, it says why. A build or a
 * refresh of the org that runs gets the offer to end it, off by default,
 * and `switchTo` gets the choice. A failed switch shows its error, and the
 * question stays open.
 */
export function SwitchDialog(props: {
  org: string
  from: string
  /** The configured accounts other than the account of the org, at least one. */
  targets: readonly string[]
  /** Why the switch build must wait, when it must. */
  wait?: SwitchWait
  switchTo: (to: string, endRunningJob: boolean) => Promise<void>
  close: () => void
}) {
  const { org, from, targets, wait } = props
  const { field } = useControlSizes()
  const [chosen, setChosen] = useState(targets[0] ?? from)
  const [end, setEnd] = useState(false)
  const write = useQuestion(props.switchTo, props.close)
  const to = targets.includes(chosen) ? chosen : (targets[0] ?? from)
  const offer = isJobWait(wait) ? endJobOffer(wait) : null
  return (
    <Dialog
      action={
        <ActionButton
          busy={write.pending}
          icon={ArrowLeftRight}
          onPress={() => write.run(to, offer !== null && end)}
          tone="primary"
        >
          {switchWords.action}
        </ActionButton>
      }
      busy={write.pending}
      close={props.close}
      title={switchTitle(org, to)}
    >
      {targets.length > 1 ? (
        <SegmentedControl
          disabled={write.pending}
          label={switchWords.choice}
          onChange={(value) => {
            setChosen(value)
            write.reset()
          }}
          options={targets.map((id) => ({ label: id, value: id }))}
          size={field}
          value={to}
          wrap
        />
      ) : null}
      {switchQuestion(org, from, to).map((text) => (
        <DialogText key={text}>{text}</DialogText>
      ))}
      {wait ? <DialogText>{switchWaitLine(org, wait)}</DialogText> : null}
      {offer ? (
        <CheckOption
          change={setEnd}
          checked={end}
          disabled={write.pending}
          hint={offer.hint}
          label={offer.label}
        />
      ) : null}
      {write.error ? (
        <Notice
          body={write.error.message}
          icon={CircleAlert}
          title={`${org} wasn't switched`}
          tone="danger"
        />
      ) : null}
    </Dialog>
  )
}

/**
 * The operator confirms Stop switch while a switch waits or builds. The
 * org stays on its account, and a switch build that runs stops. A failed
 * stop shows its error, and the question stays open.
 */
export function StopSwitchDialog(props: {
  org: string
  from: string
  item: OrgSwitch
  stop: () => Promise<void>
  close: () => void
}) {
  const { org } = props
  const write = useQuestion(props.stop, props.close)
  return (
    <Dialog
      action={
        <ActionButton
          busy={write.pending}
          icon={CircleStop}
          onPress={() => write.run()}
          tone="danger"
        >
          {switchWords.stop}
        </ActionButton>
      }
      busy={write.pending}
      close={props.close}
      title={stopTitle(props.item.to)}
    >
      <DialogText>{stopQuestion(org, props.from, props.item)}</DialogText>
      {write.error ? (
        <Notice
          body={write.error.message}
          icon={CircleAlert}
          title={`The switch of ${org} wasn't stopped`}
          tone="danger"
        />
      ) : null}
    </Dialog>
  )
}
