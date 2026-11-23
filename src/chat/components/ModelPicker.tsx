import type { AgentModel } from '../../shared/generated/AgentModel'
import { useCallback, useRef, useState } from 'react'
import { Button } from '@firna/ui/button'
import { ChevronDown } from 'lucide-react'
import type { Agent } from '../../shared/generated/Agent'
import type { AgentChoice } from '../../shared/generated/AgentChoice'
import {
  effortLabels,
  findModel,
  modelLabel,
  sameChoice,
} from '../../shared/agents'
import { useControlSizes } from '../../ui/components/common/touch'
import { pickerButtonStyle } from '../../ui/components/chat/pickerButton'
import styles from '../../ui/components/chat/ModelPicker.module.css'
import { stepShortcutItem } from '../../app/shortcuts/navigation'
import { useShortcutOffer } from '../../shell/shortcuts/shortcut-context'
import {
  ShortcutTip,
  useAriaShortcut,
  useShortcutHint,
} from '../../shell/shortcuts/shortcut-hints'
import { fastFor } from '../state/format'
import { useDismiss } from '../ui/dismiss'
import { Menu } from '../ui/Menu'
import { modelMenu } from './model-menu'
import { effortsOf, modelMenuRows } from './model-rows'

/**
 * One picker for the model and the effort of the session, such as
 * "Opus 5.5 High", with the effort in a muted colour, and "Fast" after it
 * while fast mode is on. Its menu lists the favourites first, then All
 * models, then Effort with its submenu and the Fast switch, as `modelMenuRows` says.
 * A pick of a favourite sets its model, its effort, and its fast mode.
 * `sessionAgent` is the agent of a session with messages, whose other
 * agent's models and favourites open a new session. The key of Model
 * picker opens the menu, and the key of Next effort level chooses the next
 * effort of the menu, with a wrap at its end. For a model with fast mode,
 * the key of Fast mode turns it on or off, as the Fast row of the menu does,
 * and the row shows that key. The picker shows fast mode as off for a model
 * that the model list does not mark as fast.
 */
export function ModelPicker(props: {
  choice: AgentChoice
  /** The models that the picker offers, as `composerModels` gives them. */
  models: readonly AgentModel[]
  /**
   * The favourites of the account, in the order of the menu. Without
   * them, the menu starts with All models.
   */
  favourites?: readonly AgentChoice[]
  sessionAgent?: Agent
  disabled?: boolean
  onChoose: (choice: AgentChoice) => void
}) {
  const control = useControlSizes()
  const [open, setOpen] = useState(false)
  const anchor = useRef<HTMLSpanElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(anchor, open, close)
  const { onChoose } = props
  const model = findModel(props.models, props.choice)
  const choice: AgentChoice = {
    ...props.choice,
    fast: fastFor(model, props.choice.fast),
  }
  const label = modelLabel(props.models, choice)
  const effort = effortLabels[choice.effort]
  const send = (next: AgentChoice) => {
    if (!sameChoice(next, choice)) onChoose(next)
  }
  const choose = (next: AgentChoice) => {
    setOpen(false)
    send(next)
  }
  const toggleFast = () => send({ ...choice, fast: !choice.fast })
  const nextEffort = stepShortcutItem(
    effortsOf(props.models, choice),
    choice.effort,
    1,
  )
  useShortcutOffer('model-picker', props.disabled ? null : () => setOpen(true))
  useShortcutOffer(
    'next-effort',
    props.disabled || nextEffort === undefined || nextEffort === choice.effort
      ? null
      : () => choose({ ...choice, effort: nextEffort }),
  )
  useShortcutOffer(
    'fast-mode',
    props.disabled || model?.fast !== true ? null : toggleFast,
  )
  const hint = useShortcutHint('model-picker')
  const fastHint = useShortcutHint('fast-mode')
  const keyRef = useAriaShortcut(hint)
  return (
    <span className={styles.anchor} ref={anchor}>
      <ShortcutTip hint={hint} label="Model and effort">
        <Button
          accessibilityLabel={`Model and effort: ${label}, ${effort}${choice.fast ? ', Fast' : ''}`}
          buttonRef={keyRef}
          content={
            <span
              className={styles.trigger}
              style={{ fontSize: control.labelSize }}
            >
              <span className={styles.model}>{label}</span>
              <span className={styles.effort}>{effort}</span>
              {choice.fast ? <span className={styles.fast}>Fast</span> : null}
              <ChevronDown aria-hidden className={styles.chevron} size={12} />
            </span>
          }
          disabled={props.disabled}
          expanded={open}
          hasPopup="menu"
          onPress={() => setOpen((current) => !current)}
          size="sm"
          style={pickerButtonStyle(control.height)}
          tone="plain"
        />
      </ShortcutTip>
      {open ? (
        <Menu
          anchor={anchor}
          entries={modelMenu(
            modelMenuRows(props.models, choice, {
              favourites: props.favourites ?? [],
              sessionAgent: props.sessionAgent,
            }),
            choose,
            { toggle: toggleFast, hint: fastHint },
          )}
          label="Model and effort"
          onClose={close}
          placement="above-start"
        />
      ) : null}
    </span>
  )
}
