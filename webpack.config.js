const path = require('path')

module.exports = {
  entry: './lib/index',
  target: 'node',
  mode: 'none',
  resolve: {
    mainFields: ['module', 'main'],
    extensions: ['.js']
  },
  externals: {
    'coc.nvim': 'commonjs coc.nvim',
    'vscode-emmet-helper': 'commonjs vscode-emmet-helper',
  },
  output: {
    path: path.resolve(__dirname, '.release/lib'),
    filename: 'index.js',
    libraryTarget: "commonjs",
  },
  plugins: [
  ],
  node: {
    __dirname: false,
    __filename: false
  }
}
