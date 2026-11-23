import type { Selector } from 'lightningcss'

import type { Reason } from './reasons.ts'

export function selectorReasons(selector: Selector): Reason[] {
  const reasons = new Set<Reason>()
  function visit(parts: Selector) {
    let classes = 0
    for (const part of parts) {
      switch (part.type) {
        case 'class':
          classes++
          if (classes > 1) reasons.add('compound')
          break
        case 'id':
          reasons.add('compound')
          break
        case 'combinator':
          classes = 0
          if (
            part.value !== 'pseudo-element' &&
            part.value !== 'slot-assignment' &&
            part.value !== 'part'
          ) {
            reasons.add('combinator')
          }
          break
        case 'namespace':
        case 'type':
        case 'universal':
          reasons.add('element')
          break
        case 'attribute':
          reasons.add('attribute')
          break
        case 'nesting':
          reasons.add('nesting')
          break
        case 'pseudo-element':
          reasons.add('pseudoElement')
          break
        case 'pseudo-class':
          if (part.kind === 'hover') reasons.add('hover')
          else if (
            part.kind === 'focus' ||
            part.kind === 'focus-within' ||
            part.kind === 'focus-visible'
          )
            reasons.add('focus')
          else if (part.kind === 'global') reasons.add('global')
          else reasons.add('pseudoClass')
          break
      }
      if ('selector' in part && part.selector) {
        visit(Array.isArray(part.selector) ? part.selector : [part.selector])
      }
      if ('selectors' in part && part.selectors) {
        for (const argument of part.selectors) {
          visit(Array.isArray(argument) ? argument : [argument])
        }
      }
    }
  }
  visit(selector)
  return [...reasons]
}
