import { InputFrame } from '@firna/ui/input'
import { PencilLine } from 'lucide-react'
import { noop } from '../../noop'
import { ActionButton } from '../common/actions'
import { ScreenLink } from '../common/ScreenLink'
import { StatusText } from '../common/StatusText'
import { useControlSizes, useTouch } from '../common/touch'
import {
  agentActionLabels,
  factLines,
  fixedPart,
  type AgentAction,
} from '../workspace/barCopy'
import { promptsCopy, sampleFacts } from './promptsCopy'
import { MonoBlock, Section, SectionText } from './Section'
import styles from './PromptSection.module.css'

/**
 * What one action of the Prompts tab shows: the steps in its box, whether
 * an admin saved steps of the org for it, and whether the save of typed
 * steps runs. Save is off while the box holds the saved steps.
 */
export type PromptView = {
  steps: string
  edited: boolean
  saving: boolean
}

/**
 * The rows of the box: each line of the steps, wrapped at about the width
 * of the box, and at least three rows. A view runs no script, so the box
 * cannot grow with its text.
 */
function boxRows(steps: string, touch: boolean): number {
  const perRow = touch ? 36 : 78
  const rows = steps
    .split('\n')
    .reduce(
      (sum, line) => sum + Math.max(1, Math.ceil(line.length / perRow)),
      0,
    )
  return Math.max(3, rows)
}

/** The steps in a box, which an admin edits. */
function StepsField(props: { label: string; steps: string }) {
  const { field } = useControlSizes()
  const touch = useTouch()
  return (
    <InputFrame
      accessibilityLabel={promptsCopy.stepsLabel(props.label)}
      multiline
      numberOfLines={boxRows(props.steps, touch)}
      onChangeText={noop}
      size={field}
      value={props.steps}
    />
  )
}

/**
 * Reset to default, which opens the question at `to` before it deletes
 * anything. A button that is off during a save opens nothing.
 */
function ResetButton(props: { label: string; saving: boolean; to?: string }) {
  const button = (
    <ActionButton
      accessibilityLabel={promptsCopy.resetLabel(props.label)}
      disabled={props.saving}
      tone="plain"
    >
      {promptsCopy.reset}
    </ActionButton>
  )
  if (props.to === undefined || props.saving) return button
  return (
    <ScreenLink asChild to={props.to}>
      {button}
    </ScreenLink>
  )
}

/** Save, and Reset to default on an action that the org edited. */
function PromptActions(props: {
  label: string
  view: PromptView
  resetTo?: string
}) {
  const { view } = props
  return (
    <>
      <ActionButton
        accessibilityLabel={promptsCopy.saveLabel(props.label)}
        busy={view.saving}
        disabled={!view.saving}
      >
        {promptsCopy.save}
      </ActionButton>
      {view.edited ? (
        <ResetButton
          label={props.label}
          saving={view.saving}
          to={props.resetTo}
        />
      ) : null}
    </>
  )
}

/**
 * One agent action of the Prompts tab: its label, its steps, and under
 * them the part that the app adds to each press, with sample facts. An
 * edited action shows the Edited mark. `readOnly` shows the steps as text,
 * without Save and Reset to default, for a member who is not an admin
 * (decision 57), and for everyone in a suspended org.
 */
export function PromptSection(props: {
  action: AgentAction
  view: PromptView
  readOnly?: boolean
  resetTo?: string
}) {
  const { view } = props
  const label = agentActionLabels[props.action]
  const facts = factLines(props.action, sampleFacts).length > 0
  return (
    <Section
      actions={
        props.readOnly ? undefined : (
          <PromptActions label={label} resetTo={props.resetTo} view={view} />
        )
      }
      status={
        view.edited ? (
          <StatusText
            icon={PencilLine}
            label={promptsCopy.edited}
            tone="neutral"
          />
        ) : undefined
      }
      title={label}
    >
      {props.readOnly ? (
        <p className={styles.steps}>{view.steps}</p>
      ) : (
        <StepsField label={label} steps={view.steps} />
      )}
      <div className={styles.added}>
        <SectionText muted>{promptsCopy.added(facts)}</SectionText>
        <MonoBlock text={fixedPart(props.action, sampleFacts)} />
      </div>
    </Section>
  )
}
