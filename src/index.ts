import { languages, workspace, ExtensionContext } from 'coc.nvim'
import { DefaultCompletionItemProvider } from './defaultCompletionProvider'
import { Disposable } from 'vscode-languageserver-protocol'
import { LANGUAGE_MODES, getMappingForIncludedLanguages } from './util'

export function activate(context: ExtensionContext) {
  registerCompletionProviders(context)

  context.subscriptions.push(workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration('emmet.includeLanguages')) {
      registerCompletionProviders(context)
    }
  }))
}

/**
 * Holds any registered completion providers by their language strings
 */
const languageMappingForCompletionProviders: Map<string, string> = new Map<string, string>()
const completionProvidersMapping: Map<string, Disposable> = new Map<string, Disposable>()

function registerCompletionProviders(context: ExtensionContext) {
  let completionProvider = new DefaultCompletionItemProvider()
  let includedLanguages = getMappingForIncludedLanguages()

  Object.keys(includedLanguages).forEach(language => {
    if (languageMappingForCompletionProviders.has(language) && languageMappingForCompletionProviders.get(language) === includedLanguages[language]) {
      return
    }

    if (languageMappingForCompletionProviders.has(language)) {
      const mapping = completionProvidersMapping.get(language)
      if (mapping) {
        mapping.dispose()
      }
      languageMappingForCompletionProviders.delete(language)
      completionProvidersMapping.delete(language)
    }

    const provider = languages.registerCompletionItemProvider(`emmet-${language}`, 'EM', null, completionProvider, LANGUAGE_MODES[includedLanguages[language]])
    context.subscriptions.push(provider)

    languageMappingForCompletionProviders.set(language, includedLanguages[language])
    completionProvidersMapping.set(language, provider)
  })

  Object.keys(LANGUAGE_MODES).forEach(language => {
    if (!languageMappingForCompletionProviders.has(language)) {
      const provider = languages.registerCompletionItemProvider(`emmet-${language}`, 'EM', null, completionProvider, LANGUAGE_MODES[language])
      context.subscriptions.push(provider)

      languageMappingForCompletionProviders.set(language, language)
      completionProvidersMapping.set(language, provider)
    }
  })
}
