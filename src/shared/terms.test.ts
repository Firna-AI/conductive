import { describe, expect, it } from 'vitest'

import type { LegalDocument } from '../marketing/legal-text'
import { termsDocument } from '../marketing/terms'
import { TERMS_VERSION, termsRevision } from './terms'

describe('termsRevision', () => {
  it('names the current Terms text', () => {
    expect(TERMS_VERSION).toMatch(/^terms-[0-9a-f]{14}$/)
    expect(TERMS_VERSION).toBe(termsRevision(termsDocument))
  })

  it('keeps the digest of a fixed text', () => {
    const document: LegalDocument = {
      title: 'T',
      description: 'D',
      lead: ['Lead words.'],
      sections: [
        {
          title: 'S',
          blocks: [{ kind: 'paragraph', text: ['One paragraph.'] }],
        },
      ],
    }
    // A new digest would give every user a new revision with the same text.
    expect(termsRevision(document)).toBe('terms-10ceec4f249ce0')
  })

  it('gives the same revision for the same text', () => {
    const copy: LegalDocument = structuredClone(termsDocument)
    expect(termsRevision(copy)).toBe(TERMS_VERSION)
  })

  it('gives a new revision when one word changes', () => {
    const [first, ...rest] = termsDocument.lead
    if (typeof first !== 'string') throw new Error('The lead starts with words')
    const changed: LegalDocument = {
      ...termsDocument,
      lead: [first.replace('cover', 'covers'), ...rest],
    }
    expect(changed.lead).not.toEqual(termsDocument.lead)
    expect(termsRevision(changed)).not.toBe(TERMS_VERSION)
  })
})
