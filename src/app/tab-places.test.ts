import { describe, expect, it } from 'vitest'
import { TabPlaces } from './tab-places'

/** The places of the tabs `a`, `b`, and `c`, with two views of `c`. */
function placesOfThreeTabs(): TabPlaces<number> {
  const places = new TabPlaces<number>()
  places.set('a', 1)
  places.set('b', 2)
  places.set('c', 3, 'code')
  places.set('c', 4, 'preview')
  return places
}

const all = (places: TabPlaces<number>) => [
  places.get('a'),
  places.get('b'),
  places.get('c', 'code'),
  places.get('c', 'preview'),
]

describe('the places of the tabs of a workspace', () => {
  it('forgets only the tabs that leave a known list, with each of their views', () => {
    const places = placesOfThreeTabs()
    places.follow(['a', 'b', 'c'])
    places.follow(['a', 'b'])

    expect(all(places)).toEqual([1, 2, undefined, undefined])
  })

  it('forgets nothing while the list is not known, such as while the tabs load', () => {
    const places = placesOfThreeTabs()
    places.follow(['a', 'b', 'c'])
    places.follow(null)
    places.follow([])
    places.follow(null)

    expect(all(places)).toEqual([undefined, undefined, undefined, undefined])
    const loading = placesOfThreeTabs()
    loading.follow(null)
    expect(all(loading)).toEqual([1, 2, 3, 4])
  })

  it('keeps the place of a tab that shows before the list names it', () => {
    const places = new TabPlaces<number>()
    places.follow(['a'])
    places.set('late', 7)
    places.follow(['a'])
    places.follow(['a', 'late'])

    expect(places.get('late')).toBe(7)
    places.follow(['a'])
    expect(places.get('late')).toBeUndefined()
  })
})
