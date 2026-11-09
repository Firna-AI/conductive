import { useEffect, useState } from 'react'
import { InputFrame } from '@firna/ui/input'
import { Search } from 'lucide-react'
import { useControlSizes } from '../../../docs/mockups/src/components/common/touch'
import { useNavigation } from '../../app/navigation'
import { useServices } from '../../app/services'

/** The pause after the last key before the search runs, in ms. */
const SEARCH_PAUSE_MS = 300

/**
 * The search field of the Orgs and Users tabs. The search lives in the
 * address, so Back and a link bring it back. A pause in the typing, or
 * Enter, puts the text in the address in place of the last search. A
 * search from the address, such as the Orgs tab link, replaces the text.
 */
export function SearchField(props: {
  label: string
  placeholder: string
  /** The search of the address. */
  search: string
  /** The address of a search. */
  address: (search: string) => string
}) {
  const { address } = props
  const { field } = useControlSizes()
  const { delay } = useServices()
  const navigation = useNavigation()
  const [text, setText] = useState(props.search)
  const [asked, setAsked] = useState(props.search)
  if (props.search !== asked) {
    setAsked(props.search)
    setText(props.search)
  }
  useEffect(() => {
    const search = text.trim()
    if (search === asked) return
    return delay(SEARCH_PAUSE_MS, () => {
      setAsked(search)
      navigation.replace(address(search))
    })
  }, [address, asked, delay, navigation, text])
  const ask = () => {
    const search = text.trim()
    if (search === asked) return
    setAsked(search)
    navigation.replace(address(search))
  }
  return (
    <InputFrame
      accessibilityLabel={props.label}
      onChangeText={setText}
      onSubmitEditing={ask}
      placeholder={props.placeholder}
      prefixIcon={Search}
      size={field}
      value={text}
    />
  )
}
