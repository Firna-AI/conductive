// Reads the references that load a file: the imports of code, as the
// TypeScript parser sees them, and the url() and @import paths of CSS.
// A path in a comment or in a plain string loads nothing, so it is not here.
import ts from 'typescript'

const CODE = /\.([cm]?[jt]sx?)$/

/** A CSS comment, which can hold any text. */
const CSS_COMMENT = /\/\*[\s\S]*?\*\//g

/** A CSS reference: `url()`, `@import`, or `composes: ... from`. */
export const CSS_REFERENCE =
  /url\(\s*(['"]?)([^'")\s]+)\1\s*\)|@import\s+(['"])([^'"]+)\3|composes:[^;]*?\bfrom\s+(['"])([^'"]+)\5/g

/** A path that names a file of the repository, not a package or a site. */
export function isLocal(value: string): boolean {
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return false
  return (
    !value.startsWith('/') && !value.startsWith('#') && !value.includes('$')
  )
}

/** A CSS path as a relative path: `badge.svg` names `./badge.svg`. */
export function asRelative(value: string): string {
  return value.startsWith('.') ? value : `./${value}`
}

/** The local paths that a stylesheet loads, as relative paths. */
export function cssReferences(text: string): string[] {
  const found: string[] = []
  for (const match of text.replace(CSS_COMMENT, '').matchAll(CSS_REFERENCE)) {
    const value = match[2] ?? match[4] ?? match[6]
    if (isLocal(value)) found.push(asRelative(value))
  }
  return found
}

/**
 * The module specifiers of code: static and dynamic imports, re-exports,
 * type imports, `require()`, and `new URL(path, import.meta.url)`. An
 * Astro file gives the imports of its frontmatter.
 */
export function codeImports(file: string, text: string): string[] {
  let source = text
  let kind = ts.ScriptKind.TS
  if (file.endsWith('.astro')) {
    source = /^---\n([\s\S]*?)\n---/.exec(text)?.[1] ?? ''
  } else if (!CODE.test(file)) {
    return []
  } else if (/x$/.test(file)) {
    kind = ts.ScriptKind.TSX
  }
  const tree = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    false,
    kind,
  )
  const found: string[] = []
  const literal = (node: ts.Node | undefined) => {
    if (node && ts.isStringLiteralLike(node)) found.push(node.text)
  }
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      literal(node.moduleSpecifier)
    } else if (ts.isImportTypeNode(node)) {
      const argument = node.argument
      if (ts.isLiteralTypeNode(argument)) literal(argument.literal)
    } else if (ts.isCallExpression(node)) {
      const callee = node.expression
      const loads =
        callee.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(callee) && callee.text === 'require')
      if (loads) literal(node.arguments[0])
    } else if (ts.isNewExpression(node) && isUrlFromModule(node)) {
      literal(node.arguments?.[0])
    }
    ts.forEachChild(node, visit)
  }
  visit(tree)
  return found
}

/** `new URL(path, import.meta.url)`, which Vite bundles as a file. */
function isUrlFromModule(node: ts.NewExpression): boolean {
  if (!ts.isIdentifier(node.expression) || node.expression.text !== 'URL')
    return false
  const base = node.arguments?.[1]
  return (
    base !== undefined &&
    ts.isPropertyAccessExpression(base) &&
    ts.isMetaProperty(base.expression) &&
    base.name.text === 'url'
  )
}
