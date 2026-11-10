import { useEffect, useState } from 'react'
import { CircleAlert } from 'lucide-react'
import { InlineText } from '../../../docs/mockups/src/components/common/InlineText'
import { AccountCounts } from '../../../docs/mockups/src/components/operator/AccountCounts'
import {
  onlyAccountLine,
  providerWords,
  weightsChangedLine,
} from '../../../docs/mockups/src/components/operator/providerCopy'
import { WeightFields } from '../../../docs/mockups/src/components/operator/WeightFields'
import { WeightSlider } from '../../../docs/mockups/src/components/operator/WeightSlider'
import {
  Section,
  SectionText,
} from '../../../docs/mockups/src/components/settings/Section'
import styles from '../../../docs/mockups/src/screens/OperatorProvidersScreen.module.css'
import { OperatorProviders } from '../../app/operator-providers'
import { useServices } from '../../app/services'
import { useStore } from '../../app/store'
import type { OperatorProvidersResponse } from '../../shared/operator-providers'
import { useApp } from '../context'
import { Loaded } from '../settings/LoadState'
import { ActionButton } from '../ui/actions'
import { useAction } from '../ui/useAction'
import { formatMoment } from './format'
import { OperatorPage } from './OperatorPage'
import {
  isChanged,
  totalOf,
  weightOf,
  weightsOf,
  weightTexts,
  type ProviderAccount,
  type WeightDraft,
} from './provider-weights'

/**
 * The control of the weights: a slider between two accounts, or a field
 * for each of three or more, where one slider does not fit. The slider
 * writes both of its accounts, so they add up to 100%.
 */
function WeightsControl(props: {
  accounts: readonly ProviderAccount[]
  draft: WeightDraft
  total: number | null
  disabled: boolean
  change: (draft: WeightDraft) => void
}) {
  const { accounts, draft } = props
  const texts = weightTexts(accounts, draft)
  const [first, second] = accounts
  if (accounts.length === 2 && first && second) {
    const weight = weightOf(texts[0]?.text ?? '') ?? first.weight
    return (
      <WeightSlider
        disabled={props.disabled}
        first={{ id: first.id, weight }}
        label={providerWords.weightsLabel}
        onChange={(value) =>
          props.change({
            [first.id]: String(value),
            [second.id]: String(100 - value),
          })
        }
        second={{ id: second.id, weight: 100 - weight }}
      />
    )
  }
  return (
    <WeightFields
      disabled={props.disabled}
      fields={texts}
      label={providerWords.weightsLabel}
      onChange={(id, text) => props.change({ ...draft, [id]: text })}
      total={props.total}
    />
  )
}

/**
 * The New orgs box: the weights of every configured account, the line of
 * their last change, and Save weights. Save weights is on only while the
 * weights differ from the saved ones and add up to 100%, and not while a
 * save runs. A failed save keeps the weights that the operator chose, with
 * its error under them. With one account only, a line says that it gets
 * every new org, and the box has no control.
 */
function WeightsBox(props: {
  providers: OperatorProviders
  reply: OperatorProvidersResponse
}) {
  const { accounts, updatedAt, operator } = props.reply
  const { now, timeZone } = useServices()
  const [draft, setDraft] = useState<WeightDraft>({})
  const weights = weightsOf(accounts, draft)
  const total = totalOf(weights)
  const save = useAction(async () => {
    if (weights === null) return
    await props.providers.save(weights)
    setDraft({})
  })
  const [first, second] = accounts
  if (!first || !second) {
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
  const ready = isChanged(accounts, draft) && total === 100
  const when =
    updatedAt === null ? null : formatMoment(updatedAt, now(), timeZone)
  const changedLine = weightsChangedLine(when, operator?.login ?? null)
  return (
    <Section
      actions={
        <ActionButton
          busy={save.pending}
          disabled={!ready}
          onPress={() => save.run()}
          tone="primary"
        >
          {providerWords.save}
        </ActionButton>
      }
      description={providerWords.weightsLine}
      title={providerWords.weights}
    >
      <WeightsControl
        accounts={accounts}
        change={(next) => {
          setDraft(next)
          save.reset()
        }}
        disabled={save.pending}
        draft={draft}
        total={total}
      />
      {save.error ? (
        <span className={styles.error} role="alert">
          <CircleAlert aria-hidden className={styles.icon} size={13} />
          <span>{providerWords.notSaved}</span>
        </span>
      ) : null}
      {changedLine ? <SectionText muted>{changedLine}</SectionText> : null}
    </Section>
  )
}

/**
 * The Providers tab of the operator: the weights that give each new org
 * its provider account, and the number of orgs on each account, from the
 * reply of the Worker. It names each account by its ID. While the read
 * runs, it shows a quiet spinner, and a failed read shows Try again with
 * no weight and no count, because a weight that did not load is not the
 * default.
 */
export function ProvidersTab() {
  const app = useApp()
  const [providers] = useState(() => new OperatorProviders(app))
  useEffect(() => providers.state.watch(), [providers])
  const value = useStore(providers.state.value)
  return (
    <OperatorPage tab="providers" title="Operator">
      <Loaded
        failure={providerWords.notLoaded}
        retry={() => providers.state.refresh()}
        value={value}
      >
        {(reply) => (
          <>
            <WeightsBox providers={providers} reply={reply} />
            <AccountCounts accounts={reply.accounts} />
          </>
        )}
      </Loaded>
    </OperatorPage>
  )
}
