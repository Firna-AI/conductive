import type { Declaration, DeclarationBlock } from 'lightningcss'

import type { CssDeclaration } from './css-rules.ts'

function propertyName(id: { property: string }): string | undefined {
  const prefixes =
    'vendorPrefix' in id
      ? id.vendorPrefix
      : 'vendor_prefix' in id
        ? id.vendor_prefix
        : undefined
  if (prefixes === undefined) return id.property
  if (!Array.isArray(prefixes) || prefixes.length > 1) return undefined
  const [prefix]: unknown[] = prefixes
  if (prefix === undefined || prefix === 'none') return id.property
  if (typeof prefix === 'string') return `-${prefix}-${id.property}`
}

function parsedName(declaration: Declaration): string | undefined {
  if (declaration.property === 'unparsed')
    return propertyName(declaration.value.propertyId)
  if (declaration.property === 'custom') {
    const { name } = declaration.value
    return name.startsWith('--')
      ? name
      : name.replace(/[A-Z]/g, (letter) => letter.toLowerCase())
  }
  return propertyName(declaration)
}

export function declarationNamesAgree(
  block: DeclarationBlock | undefined,
  source: CssDeclaration[],
): boolean {
  function matches(parsed: Declaration[], important: boolean) {
    const declarations = source.filter((item) => item.important === important)
    return (
      parsed.length === declarations.length &&
      parsed.every(
        (item, index) => parsedName(item) === declarations[index].name,
      )
    )
  }
  return (
    matches(block?.declarations ?? [], false) &&
    matches(block?.importantDeclarations ?? [], true)
  )
}
