import ts from 'typescript'

import { classReader } from './class-values.ts'

type ClassJoin = { file: string; line: number; values: string[] }
type ClassValueCheck = { file: string; line: number; expression: string }

export type ClassScan = { joins: ClassJoin[]; checks: ClassValueCheck[] }

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

function classExpression(
  attribute: ts.JsxAttribute,
): ts.Expression | undefined {
  if (!ts.isIdentifier(attribute.name) || attribute.name.text !== 'className')
    return undefined
  const value = attribute.initializer
  if (!value || ts.isStringLiteral(value)) return undefined
  return ts.isJsxExpression(value) ? value.expression : value
}

export function findClassJoins(file: string, tsx: string): ClassScan {
  const tree = ts.createSourceFile(
    '/view.tsx',
    tsx,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  const result: ClassScan = { joins: [], checks: [] }
  const imports = moduleImports(tree)
  if (imports.length === 0 && !tsx.includes('className')) return result
  const checker = checkBindings(tree)
  const modules = new Set(
    imports.map((name) => checker.getSymbolAtLocation(name)),
  )
  modules.delete(undefined)
  const { join, read } = classReader(tree, checker, modules)
  const lineOf = (node: ts.Node) =>
    tree.getLineAndCharacterOfPosition(node.getStart(tree)).line + 1

  function checkAttribute(attribute: ts.JsxAttribute) {
    const expression = classExpression(attribute)
    if (expression && !read(expression).readable) {
      result.checks.push({
        file,
        line: lineOf(attribute.parent.parent),
        expression: expression.getText(tree),
      })
    }
  }

  function visit(node: ts.Node, insideJoin = false) {
    if (ts.isJsxAttribute(node)) checkAttribute(node)
    if (!insideJoin && ts.isExpression(node)) {
      const found = join(node)?.values
      if (found && found.length > 1 && found.some((value) => value.module)) {
        result.joins.push({
          file,
          line: lineOf(node),
          values: found.map((value) => value.text),
        })
        insideJoin = true
      }
    }
    ts.forEachChild(node, (child) => visit(child, insideJoin))
  }

  visit(tree)
  return result
}
