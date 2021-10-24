# coc-emmet

Emmet completion support for [coc.nvim](https://github.com/neoclide/coc.nvim)

Fork of emmet extension from [VSCode](https://github.com/Microsoft/vscode) with
only completion support.

**Note**: this. extension does completion support for emmet only, you should use
https://github.com/mattn/emmet-vim

## Install

In your vim/neovim, run command:

```vim
:CocInstall coc-emmet
```

## Options

You can set these properties on your `coc-settings.json` file to customize behavior.

| Property                            | Description                                                                                                                                                                                                                   | Default value  |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| `emmet.showExpandedAbbreviation`    | Shows expanded Emmet abbreviations as suggestions.                                                                                                                                                                            | `"always"`     |
| `emmet.showAbbreviationSuggestions` | Shows possible Emmet abbreviations as suggestions. Not applicable in stylesheets or when `emmet.showExpandedAbbreviation` is `never`.                                                                                         | `true`         |
| `emmet.includeLanguages`            | Enable Emmet abbreviations in languages that are not supported by default. Add a mapping here between the language and Emmet supported language. E.g.: `{"vue-html": "html", "javascript": "javascriptreact"}`                | `{}`           |
| `emmet.variables`                   | Variables to be used in Emmet snippets                                                                                                                                                                                        | `{}`           |
| `emmet.syntaxProfiles`              | Define profile for specified syntax or use your own profile with specific rules.                                                                                                                                              | `{}`           |
| `emmet.excludeLanguages`            | An array of languages where Emmet abbreviations should not be expanded.                                                                                                                                                       | `["markdown"]` |
| `emmet.extensionsPath`              | Path to a folder containing Emmet profiles and snippets.                                                                                                                                                                      | `null`         |
| `emmet.showSuggestionsAsSnippets`   | Show Emmet completion items as snippet kind.                                                                                                                                                                                  | `true`         |
| `emmet.optimizeStylesheetParsing`   | When set to `false`, the whole file is parsed to determine if current position is valid for expanding Emmet abbreviations. When set to `true`, only the content around the current position in CSS/SCSS/Less files is parsed. | `true`         |
| `emmet.priority`                    | Priority of Emmet completion source, change to `100` for higher priority than languageserver.                                                                                                                                 | `3`            |
| `emmet.preferences`                 | Preferences used to modify behavior of some actions and resolvers of Emmet.                                                                                                                                                   | `{}`           |

## LICENSE

MIT
