import { useEffect, useState } from 'react'
import { AccountChoice } from '../../../docs/mockups/src/components/operator/AccountChoice'
import { providerWords } from '../../../docs/mockups/src/components/operator/providerCopy'
import { OperatorProviders } from '../../app/operator-providers'
import { useStore } from '../../app/store'
import { useApp } from '../context'
import { Loaded } from '../settings/LoadState'

/**
 * The provider account of a new org, which only an operator chooses: By
 * weights, the default, or a configured account by its ID. It reads the
 * configured accounts when it opens, so only an operator's screen sends
 * that read. While the read runs, a quiet spinner takes its place, and a
 * failed read shows Try again. Create org does not wait for it, because By
 * weights needs no account. A refusal of the read takes the operator
 * access away, as on every operator page, and the field goes away.
 */
export function AccountField(props: {
  value: string | null
  change: (account: string | null) => void
  disabled: boolean
}) {
  const app = useApp()
  const [providers] = useState(() => new OperatorProviders(app))
  useEffect(() => providers.state.watch(), [providers])
  const accounts = useStore(providers.state.value)
  return (
    <Loaded
      failure={providerWords.notLoaded}
      retry={() => providers.state.refresh()}
      value={accounts}
    >
      {(reply) => (
        <AccountChoice
          accounts={reply.accounts.map((account) => account.id)}
          disabled={props.disabled}
          onChange={props.change}
          value={props.value}
        />
      )}
    </Loaded>
  )
}
