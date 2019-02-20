/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { workspace } from 'coc.nvim'
import { TextDocument, Range, Position } from 'vscode-languageserver-protocol'
import parse from '@emmetio/html-matcher'
import parseStylesheet from '@emmetio/css-parser'
import { Node, HtmlNode, CssToken, Property, Rule, Stylesheet } from 'EmmetNode'
import { DocumentStreamReader, comparePosition } from './bufferStream'

let _emmetHelper: any
let _currentExtensionsPath: string | undefined

export { comparePosition }

export function positionInRange(position: Position, range: Range): number {
  let { start, end } = range
  if (comparePosition(position, start) < 0) return -1
  if (comparePosition(position, end) > 0) return 1
  return 0
}

export function getEmmetHelper(): any {
  // Lazy load emmet-helper instead of importing it
  // directly to reduce the start-up time of the extension
  if (!_emmetHelper) {
    _emmetHelper = require('vscode-emmet-helper')
  }
  updateEmmetExtensionsPath()
  return _emmetHelper
}

/**
 * Update Emmet Helper to use user snippets from the extensionsPath setting
 */
export function updateEmmetExtensionsPath(): void {
  if (!_emmetHelper) {
    return
  }
  let extensionsPath = workspace.getConfiguration('emmet')['extensionsPath']
  if (_currentExtensionsPath !== extensionsPath) {
    _currentExtensionsPath = extensionsPath
    _emmetHelper.updateExtensionsPath(extensionsPath, workspace.rootPath).then(null, (err: string) => workspace.showMessage(err, 'error'))
  }
}

/**
 * Mapping between languages that support Emmet and completion trigger characters
 */
export const LANGUAGE_MODES: { [id: string]: string[] } = {
  'html': ['!', '.', '}', ':', '*', '$', ']', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
  'jade': ['!', '.', '}', ':', '*', '$', ']', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
  'slim': ['!', '.', '}', ':', '*', '$', ']', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
  'haml': ['!', '.', '}', ':', '*', '$', ']', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
  'xml': ['.', '}', '*', '$', ']', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
  'xsl': ['!', '.', '}', '*', '$', ']', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
  'css': [':', '-', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
  'scss': [':', '-', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
  'sass': [':', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
  'less': [':', '-', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
  'stylus': [':', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
  'javascriptreact': ['!', '.', '}', '*', '$', ']', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
  'typescriptreact': ['!', '.', '}', '*', '$', ']', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
}

export function isStyleSheet(syntax: string): boolean {
  let stylesheetSyntaxes = ['css', 'scss', 'sass', 'less', 'stylus', 'wxss']
  return (stylesheetSyntaxes.indexOf(syntax) > -1)
}

export function validate(allowStylesheet: boolean = true): boolean {
  let doc = workspace.getDocument(workspace.bufnr)
  if (!doc) return false
  if (!allowStylesheet && isStyleSheet(doc.filetype)) {
    return false
  }
  return true
}

export function getMappingForIncludedLanguages(): { [index: string]: string } {
  // Explicitly map languages that have built-in grammar in VS Code to their parent language
  // to get emmet completion support
  // For other languages, users will have to use `emmet.includeLanguages` or
  // language specific extensions can provide emmet completion support
  const MAPPED_MODES: Object = {
    'handlebars': 'html',
    'php': 'html'
  }

  const finalMappedModes = Object.create(null)
  let includeLanguagesConfig = workspace.getConfiguration('emmet')['includeLanguages']
  let includeLanguages = Object.assign({}, MAPPED_MODES, includeLanguagesConfig ? includeLanguagesConfig : {})
  Object.keys(includeLanguages).forEach(syntax => {
    if (typeof includeLanguages[syntax] === 'string' && LANGUAGE_MODES[includeLanguages[syntax]]) {
      finalMappedModes[syntax] = includeLanguages[syntax]
    }
  })
  return finalMappedModes
}

/**
* Get the corresponding emmet mode for given language mode
* Eg: jsx for typescriptreact/javascriptreact or pug for jade
* If the language is not supported by emmet or has been exlcuded via `exlcudeLanguages` setting,
* then nothing is returned
*
* @param language
* @param exlcudedLanguages Array of language ids that user has chosen to exlcude for emmet
*/
export function getEmmetMode(language: string, excludedLanguages: string[]): string | undefined {
  if (!language || excludedLanguages.indexOf(language) > -1) {
    return
  }
  if (/\b(typescriptreact|javascriptreact|jsx-tags)\b/.test(language)) { // treat tsx like jsx
    return 'jsx'
  }
  if (language === 'sass-indented') { // map sass-indented to sass
    return 'sass'
  }
  if (language === 'jade') {
    return 'pug'
  }
  const emmetModes = ['html', 'pug', 'slim', 'haml', 'xml', 'xsl', 'jsx', 'css', 'scss', 'sass', 'less', 'stylus']
  if (emmetModes.indexOf(language) > -1) {
    return language
  }
  return
}

/**
 * Parses the given document using emmet parsing modules
 */
export function parseDocument(document: TextDocument, showError: boolean = true): Node | undefined {
  let parseContent = isStyleSheet(document.languageId) ? parseStylesheet : parse
  try {
    return parseContent(new DocumentStreamReader(document))
  } catch (e) {
    if (showError) {
      console.error('Emmet: Failed to parse the file')
    }
  }
  return undefined
}

const closeBrace = 125
const openBrace = 123
const slash = 47
const star = 42

/**
 * Traverse the given document backward & forward from given position
 * to find a complete ruleset, then parse just that to return a Stylesheet
 * @param document TextDocument
 * @param position Position
 */
export function parsePartialStylesheet(document: TextDocument, position: Position): Stylesheet | undefined {
  const isCSS = document.languageId === 'css'
  let startPosition = Position.create(0, 0)
  let lastLine = document.getText(Range.create(document.lineCount - 1, 0, document.lineCount, 0)).replace(/\n$/, '')
  let endPosition = Position.create(document.lineCount - 1, lastLine.length)
  const limitCharacter = document.offsetAt(position) - 5000
  const limitPosition = limitCharacter > 0 ? document.positionAt(limitCharacter) : startPosition
  const stream = new DocumentStreamReader(document, position)

  function findOpeningCommentBeforePosition(pos: Position): Position | undefined {
    let text = document.getText(Range.create(0, 0, pos.line, pos.character))
    let offset = text.lastIndexOf('/*')
    if (offset === -1) {
      return
    }
    return document.positionAt(offset)
  }

  function findClosingCommentAfterPosition(pos: Position): Position | undefined {
    let text = document.getText(Range.create(pos.line, pos.character, document.lineCount - 1, lastLine.length))
    let offset = text.indexOf('*/')
    if (offset === -1) {
      return
    }
    offset += 2 + document.offsetAt(pos)
    return document.positionAt(offset)
  }

  function consumeLineCommentBackwards() {
    if (!isCSS && currentLine !== stream.pos.line) {
      currentLine = stream.pos.line
      let line = document.getText(Range.create(currentLine, 0, currentLine + 1, 0))
      let startLineComment = line.indexOf('//')
      if (startLineComment > -1) {
        stream.pos = Position.create(currentLine, startLineComment)
      }
    }
  }

  function consumeBlockCommentBackwards() {
    if (stream.peek() === slash) {
      if (stream.backUp(1) === star) {
        stream.pos = findOpeningCommentBeforePosition(stream.pos) || startPosition
      } else {
        stream.next()
      }
    }
  }

  function consumeCommentForwards() {
    if (stream.eat(slash)) {
      if (stream.eat(slash) && !isCSS) {
        stream.pos = Position.create(stream.pos.line + 1, 0)
      } else if (stream.eat(star)) {
        stream.pos = findClosingCommentAfterPosition(stream.pos) || endPosition
      }
    }
  }

  // Go forward until we find a closing brace.
  while (!stream.eof() && !stream.eat(closeBrace)) {
    if (stream.peek() === slash) {
      consumeCommentForwards()
    } else {
      stream.next()
    }
  }

  if (!stream.eof()) {
    endPosition = stream.pos
  }

  stream.pos = position
  let openBracesToFind = 1
  let currentLine = position.line
  let exit = false

  // Go back until we found an opening brace. If we find a closing one, consume its pair and continue.
  while (!exit && openBracesToFind > 0 && !stream.sof()) {
    consumeLineCommentBackwards()

    switch (stream.backUp(1)) {
      case openBrace:
        openBracesToFind--
        break
      case closeBrace:
        if (isCSS) {
          stream.next()
          startPosition = stream.pos
          exit = true
        } else {
          openBracesToFind++
        }
        break
      case slash:
        consumeBlockCommentBackwards()
        break
      default:
        break
    }

    if (position.line - stream.pos.line > 100 || comparePosition(stream.pos, limitPosition) <= 0) {
      exit = true
    }
  }

  // We are at an opening brace. We need to include its selector.
  currentLine = stream.pos.line
  openBracesToFind = 0
  let foundSelector = false
  while (!exit && !stream.sof() && !foundSelector && openBracesToFind >= 0) {

    consumeLineCommentBackwards()

    const ch = stream.backUp(1)
    if (/\s/.test(String.fromCharCode(ch))) {
      continue
    }

    switch (ch) {
      case slash:
        consumeBlockCommentBackwards()
        break
      case closeBrace:
        openBracesToFind++
        break
      case openBrace:
        openBracesToFind--
        break
      default:
        if (!openBracesToFind) {
          foundSelector = true
        }
        break
    }

    if (!stream.sof() && foundSelector) {
      startPosition = stream.pos
    }
  }

  try {
    return parseStylesheet(new DocumentStreamReader(document, startPosition, Range.create(startPosition, endPosition)))
  } catch (e) {
    return
  }
}

/**
 * Returns node corresponding to given position in the given root node
 */
export function getNode(root: Node | undefined, position: Position, includeNodeBoundary: boolean) {
  if (!root) {
    return null
  }

  let currentNode = root.firstChild
  let foundNode: Node | null = null

  while (currentNode) {
    const nodeStart: Position = currentNode.start
    const nodeEnd: Position = currentNode.end
    if ((comparePosition(nodeStart, position) < 0 && comparePosition(nodeEnd, position) > 0)
      || (includeNodeBoundary && (comparePosition(nodeStart, position) <= 0 && comparePosition(nodeEnd, position) >= 0))) {

      foundNode = currentNode
      // Dig deeper
      currentNode = currentNode.firstChild
    } else {
      currentNode = currentNode.nextSibling
    }
  }

  return foundNode
}

export const allowedMimeTypesInScriptTag = ['text/html', 'text/plain', 'text/x-template', 'text/template', 'text/ng-template']

/**
 * Returns inner range of an html node.
 * @param currentNode
 */
export function getInnerRange(currentNode: HtmlNode): Range | undefined {
  if (!currentNode.close) {
    return undefined
  }
  return Range.create(currentNode.open.end, currentNode.close.start)
}

/**
 * Returns the deepest non comment node under given node
 * @param node
 */
export function getDeepestNode(node: Node | undefined): Node | undefined {
  if (!node || !node.children || node.children.length === 0 || !node.children.find(x => x.type !== 'comment')) {
    return node
  }
  for (let i = node.children.length - 1; i >= 0; i--) {
    if (node.children[i].type !== 'comment') {
      return getDeepestNode(node.children[i])
    }
  }
  return undefined
}

export function findNextWord(propertyValue: string, pos: number): [number | undefined, number | undefined] {

  let foundSpace = pos === -1
  let foundStart = false
  let foundEnd = false

  let newSelectionStart
  let newSelectionEnd
  while (pos < propertyValue.length - 1) {
    pos++
    if (!foundSpace) {
      if (propertyValue[pos] === ' ') {
        foundSpace = true
      }
      continue
    }
    if (foundSpace && !foundStart && propertyValue[pos] === ' ') {
      continue
    }
    if (!foundStart) {
      newSelectionStart = pos
      foundStart = true
      continue
    }
    if (propertyValue[pos] === ' ') {
      newSelectionEnd = pos
      foundEnd = true
      break
    }
  }

  if (foundStart && !foundEnd) {
    newSelectionEnd = propertyValue.length
  }

  return [newSelectionStart, newSelectionEnd]
}

export function findPrevWord(propertyValue: string, pos: number): [number | undefined, number | undefined] {

  let foundSpace = pos === propertyValue.length
  let foundStart = false
  let foundEnd = false

  let newSelectionStart
  let newSelectionEnd
  while (pos > -1) {
    pos--
    if (!foundSpace) {
      if (propertyValue[pos] === ' ') {
        foundSpace = true
      }
      continue
    }
    if (foundSpace && !foundEnd && propertyValue[pos] === ' ') {
      continue
    }
    if (!foundEnd) {
      newSelectionEnd = pos + 1
      foundEnd = true
      continue
    }
    if (propertyValue[pos] === ' ') {
      newSelectionStart = pos + 1
      foundStart = true
      break
    }
  }

  if (foundEnd && !foundStart) {
    newSelectionStart = 0
  }

  return [newSelectionStart, newSelectionEnd]
}

export function getEmmetConfiguration(syntax: string) {
  const emmetConfig = workspace.getConfiguration('emmet')
  const syntaxProfiles = Object.assign({}, emmetConfig['syntaxProfiles'] || {})
  const preferences = Object.assign({}, emmetConfig['preferences'] || {})
  // jsx, xml and xsl syntaxes need to have self closing tags unless otherwise configured by user
  if (syntax === 'jsx' || syntax === 'xml' || syntax === 'xsl') {
    syntaxProfiles[syntax] = syntaxProfiles[syntax] || {}
    if (typeof syntaxProfiles[syntax] === 'object'
      && !syntaxProfiles[syntax].hasOwnProperty('self_closing_tag') // Old Emmet format
      && !syntaxProfiles[syntax].hasOwnProperty('selfClosingStyle') // Emmet 2.0 format
    ) {
      syntaxProfiles[syntax] = {
        ...syntaxProfiles[syntax],
        selfClosingStyle: 'xml'
      }
    }
  }

  return {
    preferences,
    showExpandedAbbreviation: emmetConfig['showExpandedAbbreviation'],
    showAbbreviationSuggestions: emmetConfig['showAbbreviationSuggestions'],
    syntaxProfiles,
    variables: emmetConfig['variables'],
    excludeLanguages: emmetConfig['excludeLanguages'],
    showSuggestionsAsSnippets: emmetConfig['showSuggestionsAsSnippets']
  }
}

/**
 * Itereates by each child, as well as nested child's children, in their order
 * and invokes `fn` for each. If `fn` function returns `false`, iteration stops
 */
export function iterateCSSToken(token: CssToken, fn: (x: any) => any): boolean {
  for (let i = 0, il = token.size; i < il; i++) {
    if (fn(token.item(i)) === false || iterateCSSToken(token.item(i), fn) === false) {
      return false
    }
  }
  return true
}

/**
 * Returns `name` CSS property from given `rule`
 */
export function getCssPropertyFromRule(rule: Rule, name: string): Property | undefined {
  return rule.children.find(node => node.type === 'property' && node.name === name) as Property
}

export function getEmbeddedCssNodeIfAny(document: TextDocument, currentNode: Node | null, position: Position): Node | undefined {
  if (!currentNode) {
    return
  }
  const currentHtmlNode = <HtmlNode>currentNode
  if (currentHtmlNode && currentHtmlNode.close) {
    const innerRange = getInnerRange(currentHtmlNode)
    if (innerRange && positionInRange(position, innerRange)) {
      if (currentHtmlNode.name === 'style'
        && comparePosition(currentHtmlNode.open.end, position) < 0
        && comparePosition(currentHtmlNode.close.start, position) > 0
      ) {
        let buffer = new DocumentStreamReader(document, currentHtmlNode.open.end, Range.create(currentHtmlNode.open.end, currentHtmlNode.close.start))
        return parseStylesheet(buffer)
      }
    }
  }
  return
}

export function isStyleAttribute(currentNode: Node | null, position: Position): boolean {
  if (!currentNode) {
    return false
  }
  const currentHtmlNode = <HtmlNode>currentNode
  const index = (currentHtmlNode.attributes || []).findIndex(x => x.name.toString() === 'style')
  if (index === -1) {
    return false
  }
  const styleAttribute = currentHtmlNode.attributes[index]
  return comparePosition(position, styleAttribute.value.start) >= 0 && comparePosition(position, styleAttribute.value.end) <= 0
}
