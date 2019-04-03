# coc-emmet

Emmet completion support for [coc.nvim](https://github.com/neoclide/coc.nvim)

Fork of emmet extension from [VSCode](https://github.com/Microsoft/vscode) with
only completion support.

## Install

In your vim/neovim, run command:

```vim
:CocInstall coc-emmet
```

## Options

- `emmet.showExpandedAbbreviation`: Shows expanded Emmet abbreviations as suggestions, default `true`.
- `emmet.showAbbreviationSuggestions`: Shows possible Emmet abbreviations as suggestions. Not applicable in stylesheets or when emmet.showExpandedAbbreviation is 'never'.
- `emmet.includeLanguages`: Enable Emmet abbreviations in languages that are not supported by default. Add a mapping here between the language and emmet supported language. E.g.: `{"vue-html": "html", "javascript": "javascriptreact"}`
- `emmet.variables`: Variables to be used in Emmet snippets
- `emmet.syntaxProfiles`: Define profile for specified syntax or use your own profile with specific rules.
- `emmet.excludeLanguages`: An array of languages where Emmet abbreviations should not be expanded, default: `["markdown"]`.
- `emmet.optimizeStylesheetParsing`: When set to `false`, the whole file is parsed to determine if current position is valid for expanding Emmet abbreviations. When set to `true`, only the content around the current position in css/scss/less files is parsed.
- `emmet.preferences`: Preferences used to modify behavior of some actions and resolvers of Emmet.

## LICENSE

MIT
