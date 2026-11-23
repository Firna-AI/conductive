import ts from 'typescript'

export type ClassJoin = { file: string; line: number; values: string[] }

type ClassValue = { text: string; module: boolean }
const joinCalls = new Set(['classes', 'clsx', 'cx'])
const classNameWord = /^-?[_a-zA-Z][\w-]*$/

function unwrap(expression: ts.Expression): ts.Expression {
  while (
    ts.isParenthesizedExpression(expression) ||
    ts.isAsExpression(expression) ||
    ts.isSatisfiesExpression(expression) ||
    ts.isNonNullExpression(expression)
  ) {
    expression = expression.expression
  }
  return expression
}

function accessor(
  node: ts.Expression,
): node is ts.PropertyAccessExpression | ts.ElementAccessExpression {
  return (
    ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)
  )
}

function checkBindings(tree: ts.SourceFile) {
  const host: ts.CompilerHost = {
    getSourceFile: (file) => (file === tree.fileName ? tree : undefined),
    fileExists: (file) => file === tree.fileName,
    readFile: (file) => (file === tree.fileName ? tree.text : undefined),
    getDefaultLibFileName: () => '',
    writeFile: () => {},
    getCurrentDirectory: () => '/',
    getCanonicalFileName: (file) => file,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => '\n',
  }
  return ts
    .createProgram({
      rootNames: [tree.fileName],
      options: { noResolve: true, noLib: true, types: [] },
      host,
    })
    .getTypeChecker()
}

function moduleImports(tree: ts.SourceFile): ts.Identifier[] {
  return tree.statements.flatMap((statement) => {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      !statement.moduleSpecifier.text.endsWith('.module.css') ||
      statement.importClause?.isTypeOnly ||
      !statement.importClause?.name
    )
      return []
    return [statement.importClause.name]
  })
}

function larger(left: ClassValue[], right: ClassValue[]) {
  if (left.length !== right.length)
    return left.length > right.length ? left : right
  return left.some((value) => value.module) ? left : right
}

function classWords(text: string, source = text): ClassValue[] {
  return text
    .split(/\s+/)
    .filter((word) => classNameWord.test(word))
    .map((word) => ({ text: word === text ? source : word, module: false }))
}

export function findClassJoins(file: string, tsx: string): ClassJoin[] {
  const tree = ts.createSourceFile(
    '/view.tsx',
    tsx,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  const imports = moduleImports(tree)
  if (imports.length === 0) return []
  const checker = checkBindings(tree)
  const modules = new Set(
    imports.map((name) => checker.getSymbolAtLocation(name)),
  )
  modules.delete(undefined)
  const joins: ClassJoin[] = []

  function join(node: ts.Expression): ClassValue[] | undefined {
    if (ts.isTemplateExpression(node)) {
      return [
        ...classWords(node.head.text),
        ...node.templateSpans.flatMap((span) => [
          ...values(span.expression),
          ...classWords(span.literal.text),
        ]),
      ]
    }
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.PlusToken
    ) {
      return [...values(node.left), ...values(node.right)]
    }
    if (!ts.isCallExpression(node)) return undefined
    const callee = unwrap(node.expression)
    if (ts.isIdentifier(callee) && joinCalls.has(callee.text))
      return node.arguments.flatMap(values)
    if (
      ts.isPropertyAccessExpression(callee) &&
      callee.name.text === 'join' &&
      node.arguments.length === 1
    ) {
      const array = unwrap(callee.expression)
      const separator = unwrap(node.arguments[0])
      if (
        ts.isArrayLiteralExpression(array) &&
        ts.isStringLiteralLike(separator) &&
        separator.text === ' '
      ) {
        return array.elements.flatMap(values)
      }
    }
  }

  function values(expression: ts.Expression): ClassValue[] {
    const node = unwrap(expression)
    if (ts.isConditionalExpression(node))
      return larger(values(node.whenTrue), values(node.whenFalse))
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
    ) {
      return values(node.right)
    }
    const joined = join(node)
    if (joined) return joined
    if (accessor(node)) {
      const module = modules.has(
        checker.getSymbolAtLocation(unwrap(node.expression)),
      )
      return [{ text: node.getText(tree), module }]
    }
    if (ts.isStringLiteralLike(node))
      return classWords(node.text, node.getText(tree))
    if (ts.isIdentifier(node) || ts.isCallExpression(node)) {
      return [{ text: node.getText(tree), module: false }]
    }
    return []
  }

  function visit(node: ts.Node) {
    if (ts.isExpression(node)) {
      const found = join(node)
      if (found && found.length > 1 && found.some((value) => value.module)) {
        const { line } = tree.getLineAndCharacterOfPosition(node.getStart(tree))
        joins.push({
          file,
          line: line + 1,
          values: found.map((value) => value.text),
        })
        return
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(tree)
  return joins
}
