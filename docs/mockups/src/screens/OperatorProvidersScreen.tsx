import type { SchemaProps, Viewport } from '@mokly/mokly'
import { CircleAlert } from 'lucide-react'
import { ActionButton } from '../components/common/actions'
import { InlineText } from '../components/common/InlineText'
import { ScreenLink } from '../components/common/ScreenLink'
import { AccountCounts } from '../components/operator/AccountCounts'
import { OperatorPage } from '../components/operator/OperatorPage'
import {
  onlyAccountLine,
  providerWords,
  weightsChangedLine,
} from '../components/operator/providerCopy'
import { WeightFields } from '../components/operator/WeightFields'
import { WeightSlider } from '../components/operator/WeightSlider'
import { Section, SectionText } from '../components/settings/Section'
import {
  defaultProviders,
  movedProviders,
  oneAccountProviders,
  savedProviders,
  threeAccountProviders,
  type ProviderSettings,
} from '../fixtures/operatorProviders'
import { paths } from '../paths'
import styles from './OperatorProvidersScreen.module.css'

export const operatorProvidersSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['weights', 'accounts', 'signUps'],
  properties: {
    /**
     * The weights of new orgs: the default, moved by the operator and not
     * saved yet, saved with the time and the operator, or a save that
     * failed and keeps the moved weights.
     */
    weights: { enum: ['default', 'moved', 'saved', 'not-saved'] },
    /**
     * The settings of the Worker have both accounts, boat only, or a third
     * account. With boat only, the box has no slider, so the weights do not
     * apply. With three accounts, each account has a field.
     */
    accounts: { enum: ['both', 'boat-only', 'three'] },
    /** Sign-ups are open, or an operator paused them. */
    signUps: { enum: ['open', 'paused'] },
  },
} as const

export type OperatorProvidersState = SchemaProps<typeof operatorProvidersSchema>

type WeightsState = OperatorProvidersState['weights']

/** The three accounts, and the last change of their weights, in each state. */
function threeOf(weights: WeightsState): ProviderSettings {
  switch (weights) {
    case 'default':
      return threeAccountProviders.default
    case 'moved':
      return threeAccountProviders.moved
    case 'not-saved':
      return threeAccountProviders.notSaved
    case 'saved':
      return threeAccountProviders.saved
  }
}

/** The accounts, and the last change of their weights, in each state. */
function settingsOf(state: OperatorProvidersState): ProviderSettings {
  if (state.accounts === 'boat-only') return oneAccountProviders
  if (state.accounts === 'three') return threeOf(state.weights)
  switch (state.weights) {
    case 'default':
      return defaultProviders
    case 'moved':
    case 'not-saved':
      return movedProviders
    case 'saved':
      return savedProviders
  }
}

/**
 * Save weights, on only while the control holds weights that are not
 * saved and add up to 100%. It acts at once, with no question, because the
 * weights change only the orgs that are created after it.
 */
function SaveWeights(props: { on: boolean }) {
  const save = (
    <ActionButton disabled={!props.on} tone="primary">
      {providerWords.save}
    </ActionButton>
  )
  if (!props.on) return save
  return (
    <ScreenLink asChild to={paths.operatorProvidersSaved}>
      {save}
    </ScreenLink>
  )
}

/**
 * The New orgs box: the slider between two accounts, or a field for each
 * of three or more, the error of a save that failed, the line of the last
 * change, and Save weights. With one account only, a line says that it
 * gets every new org, in place of the control.
 */
function WeightsSection(props: {
  settings: ProviderSettings
  weights: WeightsState
}) {
  const { accounts } = props.settings
  const [first, second] = accounts
  if (first === undefined || second === undefined) {
    return (
      <Section title={providerWords.weights}>
        {first ? (
          <SectionText>
            <InlineText text={onlyAccountLine(first.id)} />
          </SectionText>
        ) : null}
      </Section>
    )
  }
  const changed = weightsChangedLine(
    props.settings.updatedAt,
    props.settings.operator,
  )
  const unsaved = props.weights === 'moved' || props.weights === 'not-saved'
  const total = accounts.reduce((sum, item) => sum + item.weight, 0)
  return (
    <Section
      actions={<SaveWeights on={unsaved && total === 100} />}
      description={providerWords.weightsLine}
      title={providerWords.weights}
    >
      {accounts.length === 2 ? (
        <WeightSlider
          first={first}
          label={providerWords.weightsLabel}
          second={second}
        />
      ) : (
        <WeightFields
          fields={accounts.map((item) => ({
            id: item.id,
            text: String(item.weight),
          }))}
          label={providerWords.weightsLabel}
          total={total}
        />
      )}
      {props.weights === 'not-saved' ? (
        <span className={styles.error} role="alert">
          <CircleAlert aria-hidden className={styles.icon} size={13} />
          <span>{providerWords.notSaved}</span>
        </span>
      ) : null}
      {changed ? <SectionText muted>{changed}</SectionText> : null}
    </Section>
  )
}

/**
 * The Providers tab of the operator: the weights that give each new org
 * its provider account, as one slider between `boat` and `e2b`, or a field
 * for each of three or more accounts, and the number of orgs on each
 * account. Operator screens name each account by
 * its ID. An org keeps its account for its whole life, so a change of the
 * weights moves no org.
 */
export function OperatorProvidersScreen(props: {
  state: OperatorProvidersState
  viewport: Viewport
}) {
  const settings = settingsOf(props.state)
  return (
    <OperatorPage
      signUps={props.state.signUps}
      tab="providers"
      title="Operator"
      viewport={props.viewport}
    >
      <WeightsSection settings={settings} weights={props.state.weights} />
      <AccountCounts accounts={settings.accounts} />
    </OperatorPage>
  )
}
