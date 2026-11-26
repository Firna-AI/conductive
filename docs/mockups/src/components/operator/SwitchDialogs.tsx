import type { Viewport } from '../../../../../src/ui/components/common/viewport'
import { SegmentedControl } from '@firna/ui/segmented'
import { ArrowLeftRight, CircleStop } from 'lucide-react'
import { noop } from '../../../../../src/ui/noop'
import { ActionButton } from '../../../../../src/ui/components/common/actions'
import { CheckOption } from '../common/CheckOption'
import {
  ConfirmDialog,
  DialogText,
} from '../../../../../src/ui/components/common/ConfirmDialog'
import { ScreenLink } from '../common/ScreenLink'
import { useControlSizes } from '../../../../../src/ui/components/common/touch'
import {
  endBuildOffer,
  stopQuestion,
  stopTitle,
  switchQuestion,
  switchTitle,
  switchWaitLine,
  switchWords,
  type OrgSwitch,
  type SwitchWait,
} from '../../../../../src/ui/components/operator/switchCopy'

/** The links of a question: the page of Cancel, and the page after it. */
type QuestionLinks = { cancel: string; done: string }

/** Cancel, then the action that the question confirms. */
function QuestionActions(props: {
  links: QuestionLinks
  label: string
  stop?: boolean
}) {
  return (
    <>
      <ScreenLink asChild to={props.links.cancel}>
        <ActionButton>Cancel</ActionButton>
      </ScreenLink>
      <ScreenLink asChild to={props.links.done}>
        <ActionButton
          icon={props.stop ? CircleStop : ArrowLeftRight}
          tone={props.stop ? 'danger' : 'primary'}
        >
          {props.label}
        </ActionButton>
      </ScreenLink>
    </>
  )
}

/**
 * The operator confirms a switch of the provider account of an org. The
 * question names the new account. With one other configured account, it
 * names that one. With more, it offers each account other than the current
 * one by its ID, and its title and its words follow the choice. It says
 * that the switch builds the cloud computer of the org again on the new
 * account, that new workspaces move when that build succeeds, and that
 * existing workspaces stay. When the build must wait, it says why. A build
 * of the org that runs gets an offer to end it, off by default.
 */
export function SwitchDialog(props: {
  org: string
  from: string
  /** The configured accounts other than the account of the org. */
  targets: readonly string[]
  /** The chosen account. */
  to: string
  /** Why the switch build waits, when it must wait. */
  wait?: SwitchWait
  viewport: Viewport
  links: QuestionLinks
}) {
  const { field } = useControlSizes()
  const { wait } = props
  return (
    <ConfirmDialog
      actions={
        <QuestionActions label={switchWords.action} links={props.links} />
      }
      title={switchTitle(props.org, props.to)}
      viewport={props.viewport}
    >
      {props.targets.length > 1 ? (
        <SegmentedControl
          label={switchWords.choice}
          onChange={noop}
          options={props.targets.map((id) => ({ label: id, value: id }))}
          size={field}
          value={props.to}
          wrap
        />
      ) : null}
      {switchQuestion(props.org, props.from, props.to).map((text) => (
        <DialogText key={text}>{text}</DialogText>
      ))}
      {wait ? <DialogText>{switchWaitLine(props.org, wait)}</DialogText> : null}
      {wait?.kind === 'build' ? (
        <CheckOption checked={false} {...endBuildOffer(wait.by)} />
      ) : null}
    </ConfirmDialog>
  )
}

/**
 * The operator confirms Stop switch, the switch back to the account of the
 * org while a switch waits or builds. The org stays on its account, and a
 * switch build that runs stops.
 */
export function StopSwitchDialog(props: {
  org: string
  from: string
  item: OrgSwitch
  viewport: Viewport
  links: QuestionLinks
}) {
  return (
    <ConfirmDialog
      actions={
        <QuestionActions label={switchWords.stop} links={props.links} stop />
      }
      title={stopTitle(props.item.to)}
      viewport={props.viewport}
    >
      <DialogText>{stopQuestion(props.org, props.from, props.item)}</DialogText>
    </ConfirmDialog>
  )
}
