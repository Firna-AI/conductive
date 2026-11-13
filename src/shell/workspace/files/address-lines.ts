import { useEffect, useState } from 'react'
import { useHref, useNavigation } from '../../../app/navigation'
import type { MarkedLines } from '../../../files/code/CodeView'
import { addressLines } from './files-address'

/** The lines that the query of an address names, or null. */
function linesAt(href: string) {
  return addressLines(new URL(href, 'https://app.invalid').search)
}

/**
 * The lines that the address of the shown file tab names, with the number
 * of each visit of an address with lines. A visit is each move of the
 * address, also to the same address, as a second press on the same chip
 * makes. A change of the file is no visit, so it shows the lines again only
 * after a press, a link, or a move back or forward.
 */
export function useAddressLines(): MarkedLines | null {
  const navigation = useNavigation()
  const range = linesAt(useHref())
  const [visit, setVisit] = useState(0)
  useEffect(
    () =>
      navigation.subscribe(() => {
        if (linesAt(navigation.href())) setVisit((count) => count + 1)
      }),
    [navigation],
  )
  return range ? { range, visit } : null
}
