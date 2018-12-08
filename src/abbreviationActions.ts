import { workspace } from 'coc.nvim'
import { HtmlNode, Node, Property, Rule, Stylesheet } from 'EmmetNode'
import { Position, Range, TextDocument } from 'vscode-languageserver-protocol'
import { comparePosition, positionInRange, getMappingForIncludedLanguages, getEmmetMode, allowedMimeTypesInScriptTag, getInnerRange, isStyleSheet } from './util'

const hexColorRegex = /^#[\d,a-f,A-F]{0,6}$/

/**
 * Checks if given position is a valid location to expand emmet abbreviation.
 * Works only on html and css/less/scss syntax
 * @param document current Text Document
 * @param rootNode parsed document
 * @param currentNode current node in the parsed document
 * @param syntax syntax of the abbreviation
 * @param position position to validate
 * @param abbreviationRange The range of the abbreviation for which given position is being validated
 */
export function isValidLocationForEmmetAbbreviation(document: TextDocument, rootNode: Node | undefined, currentNode: Node | null, syntax: string, position: Position, abbreviationRange: Range): boolean {
  if (isStyleSheet(syntax)) {
    const stylesheet = <Stylesheet>rootNode
    if (stylesheet &&
      (stylesheet.comments || []).some(x => comparePosition(position, x.start) >= 0 && comparePosition(position, x.end) <= 0)) {
      return false
    }
    // Continue validation only if the file was parse-able and the currentNode has been found
    if (!currentNode) {
      return true
    }

    // Fix for https://github.com/Microsoft/issues/34162
    // Other than sass, stylus, we can make use of the terminator tokens to validate position
    if (syntax !== 'sass' && syntax !== 'stylus' && currentNode.type === 'property') {

      // Fix for upstream issue https://github.com/emmetio/css-parser/issues/3
      if (currentNode.parent
        && currentNode.parent.type !== 'rule'
        && currentNode.parent.type !== 'at-rule') {
        return false
      }

      const abbreviation = document.getText(Range.create(abbreviationRange.start.line, abbreviationRange.start.character, abbreviationRange.end.line, abbreviationRange.end.character))
      const propertyNode = <Property>currentNode
      if (propertyNode.terminatorToken
        && propertyNode.separator
        && comparePosition(position, propertyNode.separatorToken.end) >= 0
        && comparePosition(position, propertyNode.terminatorToken.start) <= 0
        && abbreviation.indexOf(':') === -1) {
        return hexColorRegex.test(abbreviation) || abbreviation === '!'
      }
      if (!propertyNode.terminatorToken
        && propertyNode.separator
        && comparePosition(position, propertyNode.separatorToken.end) >= 0
        && abbreviation.indexOf(':') === -1) {
        return hexColorRegex.test(abbreviation) || abbreviation === '!'
      }
      if (hexColorRegex.test(abbreviation) || abbreviation === '!') {
        return false
      }
    }

    // If current node is a rule or at-rule, then perform additional checks to ensure
    // emmet suggestions are not provided in the rule selector
    if (currentNode.type !== 'rule' && currentNode.type !== 'at-rule') {
      return true
    }

    const currentCssNode = <Rule>currentNode

    // Position is valid if it occurs after the `{` that marks beginning of rule contents
    if (comparePosition(position, currentCssNode.contentStartToken.end) > 0) {
      return true
    }

    // Workaround for https://github.com/Microsoft/30188
    // The line above the rule selector is considered as part of the selector by the css-parser
    // But we should assume it is a valid location for css properties under the parent rule
    if (currentCssNode.parent
      && (currentCssNode.parent.type === 'rule' || currentCssNode.parent.type === 'at-rule')
      && currentCssNode.selectorToken
      && position.line !== currentCssNode.selectorToken.end.line
      && currentCssNode.selectorToken.start.character === abbreviationRange.start.character
      && currentCssNode.selectorToken.start.line === abbreviationRange.start.line
    ) {
      return true
    }

    return false
  }

  const startAngle = '<'
  const endAngle = '>'
  const escape = '\\'
  const question = '?'
  const currentHtmlNode = <HtmlNode>currentNode
  let start = Position.create(0, 0)

  if (currentHtmlNode) {
    if (currentHtmlNode.name === 'script') {
      const typeAttribute = (currentHtmlNode.attributes || []).filter(x => x.name.toString() === 'type')[0]
      const typeValue = typeAttribute ? typeAttribute.value.toString() : ''

      if (allowedMimeTypesInScriptTag.indexOf(typeValue) > -1) {
        return true
      }

      const isScriptJavascriptType = !typeValue || typeValue === 'application/javascript' || typeValue === 'text/javascript'
      if (isScriptJavascriptType) {
        return !!getSyntaxFromArgs({ language: 'javascript' })
      }
      return false
    }

    const innerRange = getInnerRange(currentHtmlNode)

    // Fix for https://github.com/Microsoft/issues/28829
    if (!innerRange || !positionInRange(position, innerRange)) {
      return false
    }

    // Fix for https://github.com/Microsoft/issues/35128
    // Find the position up till where we will backtrack looking for unescaped < or >
    // to decide if current position is valid for emmet expansion
    start = innerRange.start
    let lastChildBeforePosition = currentHtmlNode.firstChild
    while (lastChildBeforePosition) {
      if (comparePosition(lastChildBeforePosition.end, position) > 0) {
        break
      }
      start = lastChildBeforePosition.end
      lastChildBeforePosition = lastChildBeforePosition.nextSibling
    }
  }
  let textToBackTrack = document.getText(Range.create(start.line, start.character, abbreviationRange.start.line, abbreviationRange.start.character))

  // Worse case scenario is when cursor is inside a big chunk of text which needs to backtracked
  // Backtrack only 500 offsets to ensure we dont waste time doing this
  if (textToBackTrack.length > 500) {
    textToBackTrack = textToBackTrack.substr(textToBackTrack.length - 500)
  }

  if (!textToBackTrack.trim()) {
    return true
  }

  let valid = true
  let foundSpace = false; // If < is found before finding whitespace, then its valid abbreviation. Eg: <div|
  let i = textToBackTrack.length - 1
  if (textToBackTrack[i] === startAngle) {
    return false
  }

  while (i >= 0) {
    const char = textToBackTrack[i]
    i--
    if (!foundSpace && /\s/.test(char)) {
      foundSpace = true
      continue
    }
    if (char === question && textToBackTrack[i] === startAngle) {
      i--
      continue
    }
    // Fix for https://github.com/Microsoft/issues/55411
    // A space is not a valid character right after < in a tag name.
    if (/\s/.test(char) && textToBackTrack[i] === startAngle) {
      i--
      continue
    }
    if (char !== startAngle && char !== endAngle) {
      continue
    }
    if (i >= 0 && textToBackTrack[i] === escape) {
      i--
      continue
    }
    if (char === endAngle) {
      if (i >= 0 && textToBackTrack[i] === '=') {
        continue; // False alarm of cases like =>
      } else {
        break
      }
    }
    if (char === startAngle) {
      valid = !foundSpace
      break
    }
  }
  return valid
}

function getSyntaxFromArgs(args: { [x: string]: string }): string | undefined {
  const mappedModes = getMappingForIncludedLanguages()
  const language: string = args['language']
  const parentMode: string = args['parentMode']
  const excludedLanguages = workspace.getConfiguration('emmet')['excludeLanguages'] ? workspace.getConfiguration('emmet')['excludeLanguages'] : []
  if (excludedLanguages.indexOf(language) > -1) {
    return
  }

  let syntax = getEmmetMode((mappedModes[language] ? mappedModes[language] : language), excludedLanguages)
  if (!syntax) {
    syntax = getEmmetMode((mappedModes[parentMode] ? mappedModes[parentMode] : parentMode), excludedLanguages)
  }

  return syntax
}
