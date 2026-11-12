import { SegmentedControl, type SegmentOption } from '@firna/ui/segmented'
import { noop } from '../../noop'
import { useControlSizes } from '../common/touch'
import { accountChoiceWords } from './providerCopy'

/** The value of By weights. Each account has a prefix, so no ID can match it. */
const byWeights = 'weights'

/** The value of an account in the control. */
function accountValue(account: string): string {
  return `account:${account}`
}

/** The account of a value of the control, or null for By weights. */
function accountOf(value: string): string | null {
  return value === byWeights ? null : value.slice(accountValue('').length)
}

/**
 * The provider account of a new org, on Create org. Only an operator sees
 * it. It offers By weights, the default, and each configured account by
 * its ID. `value` is the chosen account, or null for By weights, which
 * leaves the account to the weights of the Providers tab. The options wrap
 * onto more lines when many accounts do not fit. `disabled` turns the
 * choice off, such as while the create runs. It imports no fixture, so the
 * app uses it too.
 */
export function AccountChoice(props: {
  accounts: readonly string[]
  value: string | null
  onChange?: (account: string | null) => void
  disabled?: boolean
}) {
  const { field } = useControlSizes()
  const options: SegmentOption<string>[] = [
    { label: accountChoiceWords.weights, value: byWeights },
    ...props.accounts.map((account) => ({
      label: account,
      value: accountValue(account),
    })),
  ]
  const onChange = props.onChange
  return (
    <SegmentedControl
      disabled={props.disabled}
      hint={accountChoiceWords.hint}
      label={accountChoiceWords.label}
      onChange={onChange ? (value) => onChange(accountOf(value)) : noop}
      options={options}
      size={field}
      value={props.value === null ? byWeights : accountValue(props.value)}
      wrap
    />
  )
}
