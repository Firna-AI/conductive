import { InputFrame } from '@firna/ui/input'
import { Search } from 'lucide-react'
import { noop } from '../../noop'
import { useControlSizes } from './touch'

/**
 * The search field at the top of a list that it narrows, such as the
 * repositories of an org, the tabs of the operator, or the Keyboard
 * shortcuts tab. `query` is the text in the field.
 */
export function SearchField(props: {
  label: string
  placeholder: string
  query: string
}) {
  const { field } = useControlSizes()
  return (
    <InputFrame
      accessibilityLabel={props.label}
      onChangeText={noop}
      placeholder={props.placeholder}
      prefixIcon={Search}
      size={field}
      value={props.query}
    />
  )
}
