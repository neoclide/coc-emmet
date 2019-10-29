import { languages, workspace, ExtensionContext } from 'coc.nvim'
import { DefaultCompletionItemProvider } from './defaultCompletionProvider'
import { LANGUAGE_MODES, getMappingForIncludedLanguages } from './util'

export function activate(context: ExtensionContext): void {
  registerCompletionProviders(context)

  context.subscriptions.push(workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration('emmet.includeLanguages')) {
      registerCompletionProviders(context)
    }
  }))

  workspace.onDidOpenTextDocument(() => {
    registerCompletionProviders(context)
  }, null, context.subscriptions)
}

/**
 * Holds any registered completion providers by their language strings
 */
const registeredModes: Set<string> = new Set()
function registerCompletionProviders(context: ExtensionContext): void {
  let includedLanguages = getMappingForIncludedLanguages()

  let current_languages = workspace.filetypes
  const emmetConfig = workspace.getConfiguration('emmet')
  for (let language of current_languages) {
    let emmetMode = Object.keys(LANGUAGE_MODES).find(s => s == language) || includedLanguages[language]
    if (!emmetMode || registeredModes.has(emmetMode)) continue
    registeredModes.add(emmetMode)
    let filetypes = [emmetMode]
    if (emmetMode != language) {
      filetypes.push(language)
    }
    for (let key of Object.keys(includedLanguages)) {
      let val = includedLanguages[key]
      if (val == emmetMode && filetypes.indexOf(val) == -1) {
        filetypes.push(val)
      }
    }
    let completionProvider = new DefaultCompletionItemProvider()
    const provider = languages.registerCompletionItemProvider(`emmet-${emmetMode}`, 'EM', filetypes, completionProvider, LANGUAGE_MODES[emmetMode], emmetConfig.get('priority', 3))
    context.subscriptions.push(provider)
  }
}
