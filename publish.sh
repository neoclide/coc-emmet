#! /bin/sh

set -e
[ "$TRACE" ] && set -x

version=$(json version < package.json)
git add .
git commit -a -m "Release $version"
git tag -a "$version" -m "Release $version"
git push --tags
git push
mkdir -p .release/lib
cp -r Readme.md .release
cat package.json | json -e 'this.dependencies={"vscode-emmet-helper": "^1.2.15"};this.scripts={}' > .release/package.json
webpack --config webpack.config.js
cd .release && yarn install --prod && npm publish
