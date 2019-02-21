/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CompletionItemProvider, workspace } from 'coc.nvim'
import { Node, Stylesheet } from 'EmmetNode'
import { CancellationToken, CompletionContext, CompletionItem, CompletionList, CompletionTriggerKind, InsertTextFormat, Position, Range, TextDocument, CompletionItemKind } from 'vscode-languageserver-protocol'
import { isValidLocationForEmmetAbbreviation } from './abbreviationActions'
import { getEmbeddedCssNodeIfAny, getEmmetConfiguration, getEmmetHelper, getEmmetMode, getMappingForIncludedLanguages, getNode, isStyleAttribute, isStyleSheet, parseDocument, parsePartialStylesheet } from './util'

export class DefaultCompletionItemProvider implements CompletionItemProvider {

  private lastCompletionType: string | undefined

  public provideCompletionItems(document: TextDocument, position: Position, _: CancellationToken, context: CompletionContext): Thenable<CompletionList | undefined> | undefined {
    const completionResult = this.provideCompletionItemsInternal(document, position, context)
    if (!completionResult) {
      this.lastCompletionType = undefined
      return
    }

    return completionResult.then(completionList => {
      if (!completionList || !completionList.items.length) {
        this.lastCompletionType = undefined
        return null
      }
      const item = completionList.items[0]
      const expandedText = item.documentation ? item.documentation.toString() : ''

      if (expandedText.startsWith('<')) {
        this.lastCompletionType = 'html'
      } else if (expandedText.indexOf(':') > 0 && expandedText.endsWith(';')) {
        this.lastCompletionType = 'css'
      } else {
        this.lastCompletionType = undefined
      }
      return completionList
    })
  }

  private provideCompletionItemsInternal(document: TextDocument, position: Position, context: CompletionContext): Thenable<CompletionList | undefined> | undefined {
    const emmetConfig = workspace.getConfiguration('emmet')
    const excludedLanguages = emmetConfig['excludeLanguages'] ? emmetConfig['excludeLanguages'] : []
    if (excludedLanguages.indexOf(document.languageId) > -1) {
      return
    }

    const mappedLanguages = getMappingForIncludedLanguages()
    const isSyntaxMapped = mappedLanguages[document.languageId] ? true : false
    let syntax = getEmmetMode((isSyntaxMapped ? mappedLanguages[document.languageId] : document.languageId), excludedLanguages)

    if (!syntax || emmetConfig['showExpandedAbbreviation'] === 'never') {
      return
    }

    const helper = getEmmetHelper()
    let validateLocation = syntax === 'html' || syntax === 'jsx' || syntax === 'xml'
    let rootNode: Node
    let currentNode: Node | null = null

    if (document.languageId === 'html') {
      if (context.triggerKind === CompletionTriggerKind.TriggerForIncompleteCompletions) {
        switch (this.lastCompletionType) {
          case 'html':
            validateLocation = false
            break
          case 'css':
            validateLocation = false
            syntax = 'css'
            break
          default:
            break
        }

      }
      if (validateLocation) {
        rootNode = parseDocument(document, false)
        currentNode = getNode(rootNode, position, true)
        if (isStyleAttribute(currentNode, position)) {
          syntax = 'css'
          validateLocation = false
        } else {
          const embeddedCssNode = getEmbeddedCssNodeIfAny(document, currentNode, position)
          if (embeddedCssNode) {
            currentNode = getNode(embeddedCssNode, position, true)
            syntax = 'css'
          }
        }
      }

    }

    const extractAbbreviationResults = helper.extractAbbreviation(document, position, !isStyleSheet(syntax))
    if (!extractAbbreviationResults || !helper.isAbbreviationValid(syntax, extractAbbreviationResults.abbreviation)) {
      return
    }

    if (isStyleSheet(document.languageId) && context.triggerKind !== CompletionTriggerKind.TriggerForIncompleteCompletions) {
      validateLocation = true
      let usePartialParsing = workspace.getConfiguration('emmet')['optimizeStylesheetParsing'] === true
      rootNode = usePartialParsing && document.lineCount > 1000 ? parsePartialStylesheet(document, position) : <Stylesheet>parseDocument(document, false)
      if (!rootNode) {
        return
      }
      currentNode = getNode(rootNode, position, true)
    }

    if (validateLocation && !isValidLocationForEmmetAbbreviation(document, rootNode, currentNode, syntax, position, extractAbbreviationResults.abbreviationRange)) {
      return
    }

    let noiseCheckPromise: Thenable<any> = Promise.resolve()

    // Fix for https://github.com/Microsoft/issues/32647
    // Check for document symbols in js/ts/jsx/tsx and avoid triggering emmet for abbreviations of the form symbolName.sometext
    // Presence of > or * or + in the abbreviation denotes valid abbreviation that should trigger emmet
    if (!isStyleSheet(syntax) && (document.languageId === 'javascript' || document.languageId === 'javascriptreact' || document.languageId === 'typescript' || document.languageId === 'typescriptreact')) {
      let abbreviation: string = extractAbbreviationResults.abbreviation
      if (abbreviation.startsWith('this.')) {
        noiseCheckPromise = Promise.resolve(true)
      }
    }

    return noiseCheckPromise.then((noise): CompletionList | undefined => {
      if (noise) {
        return
      }

      let result = helper.doComplete(document, position, syntax, getEmmetConfiguration(syntax!))
      let newItems: CompletionItem[] = []
      let { option } = context as any
      if (result && result.items) {
        result.items.forEach((item: any) => {
          let newItem: CompletionItem = { label: item.label }
          newItem.documentation = item.documentation
          newItem.detail = item.detail
          newItem.insertTextFormat = InsertTextFormat.Snippet
          let oldrange = item.textEdit.range
          newItem.textEdit = {
            range: Range.create(oldrange.start.line, oldrange.start.character, oldrange.end.line, oldrange.end.character),
            newText: item.textEdit.newText
          }
          if (emmetConfig['showSuggestionsAsSnippets'] === true) {
            newItem.kind = CompletionItemKind.Snippet
          }
          newItem.filterText = option ? option.input : item.word
          newItem.data = { word: newItem.filterText }
          newItem.sortText = item.sortText
          newItems.push(newItem)
        })
      }
      return {
        items: newItems,
        isIncomplete: true
      }
    })
  }
}
