import ts from 'typescript'

type ClassValue = { text: string; module: boolean }
type Reading = { values: ClassValue[]; readable: boolean }

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

function classWords(text: string, source = text): Reading {
  const values = text
    .split(/\s+/)
    .filter((word) => classNameWord.test(word))
    .map((word) => ({ text: word === text ? source : word, module: false }))
  return { values, readable: true }
}

function concatenate(parts: Reading[]): Reading {
  return {
    values: parts.flatMap((part) => part.values),
    readable: parts.every((part) => part.readable),
  }
}

function hasModule(reading: Reading): boolean {
  return reading.values.some((value) => value.module)
}

export function classReader(
  tree: ts.SourceFile,
  checker: ts.TypeChecker,
  modules: ReadonlySet<ts.Symbol | undefined>,
) {
  const resolving = new Set<ts.VariableDeclaration>()

  function single(
    node: ts.Expression,
    readable: boolean,
    module = false,
  ): Reading {
    return { values: [{ text: node.getText(tree), module }], readable }
  }

  function choice(node: ts.Expression, left: Reading, right: Reading): Reading {
    if (!left.readable || !right.readable)
      return single(node, false, hasModule(left) || hasModule(right))
    if (left.values.length !== right.values.length)
      return left.values.length > right.values.length ? left : right
    return hasModule(left) ? left : right
  }

  function identifier(node: ts.Identifier): Reading {
    const symbol = checker.getSymbolAtLocation(node)
    if (node.text === 'undefined' && !symbol?.declarations?.length)
      return { values: [], readable: true }
    let declaration = symbol?.valueDeclaration
    const binding = declaration
    while (declaration && ts.isBindingElement(declaration))
      declaration = declaration.parent.parent
    if (declaration && ts.isParameter(declaration)) return single(node, true)
    if (
      !declaration ||
      !ts.isVariableDeclaration(declaration) ||
      !ts.isVariableDeclarationList(declaration.parent) ||
      !(declaration.parent.flags & ts.NodeFlags.Const) ||
      !declaration.initializer ||
      resolving.has(declaration)
    )
      return single(node, false)

    resolving.add(declaration)
    const value = read(declaration.initializer)
    resolving.delete(declaration)
    if (binding !== declaration) return single(node, value.readable)
    if (!value.readable || value.values.length === 1)
      return single(node, value.readable, hasModule(value))
    return value
  }

  function join(node: ts.Expression): Reading | undefined {
    if (ts.isTemplateExpression(node)) {
      return concatenate([
        classWords(node.head.text),
        ...node.templateSpans.flatMap((span) => [
          read(span.expression),
          classWords(span.literal.text),
        ]),
      ])
    }
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.PlusToken
    )
      return concatenate([read(node.left), read(node.right)])
    if (!ts.isCallExpression(node)) return undefined
    const callee = unwrap(node.expression)
    if (ts.isIdentifier(callee) && joinCalls.has(callee.text))
      return concatenate(node.arguments.map(read))
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
      )
        return concatenate(array.elements.map(read))
    }
  }

  function read(expression: ts.Expression): Reading {
    const node = unwrap(expression)
    if (ts.isConditionalExpression(node))
      return choice(node, read(node.whenTrue), read(node.whenFalse))
    if (ts.isBinaryExpression(node)) {
      const operator = node.operatorToken.kind
      if (operator === ts.SyntaxKind.AmpersandAmpersandToken) {
        const right = read(node.right)
        return right.readable ? right : single(node, false, hasModule(right))
      }
      if (
        operator === ts.SyntaxKind.BarBarToken ||
        operator === ts.SyntaxKind.QuestionQuestionToken
      )
        return choice(node, read(node.left), read(node.right))
    }
    const joined = join(node)
    if (joined) return joined
    if (
      ts.isPropertyAccessExpression(node) ||
      ts.isElementAccessExpression(node)
    ) {
      const module = modules.has(
        checker.getSymbolAtLocation(unwrap(node.expression)),
      )
      return single(node, true, module)
    }
    if (ts.isStringLiteralLike(node))
      return classWords(node.text, node.getText(tree))
    if (ts.isIdentifier(node)) return identifier(node)
    if (
      node.kind === ts.SyntaxKind.FalseKeyword ||
      node.kind === ts.SyntaxKind.NullKeyword ||
      ts.isOmittedExpression(node)
    )
      return { values: [], readable: true }
    return single(node, false)
  }

  return { join, read }
}
