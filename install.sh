#!/bin/bash

# Author: Stefan Schulte <stschulte@posteo.de>
#
# This little script removes all dependencies from
# package.json and removes the package-lock.json and
# node_modules. It then reinstalls all packages and recreates
# package.json and package-lock.json this way.
#
# This should be an easy way to update all dependencies to the
# latest version. Of course this does not mean that the latest
# dependencies don't introduce any breaking changes, so use with
# care!

set -e

# List of runtime dependencies
RUNTIME_DEPENDENCIES=(
  "@actions/core"
  "@aws-sdk/client-s3"
  "unzipper"
)

# List of buildtime dependencies or developer
# dependencies
BUILDTIME_DEPENDENCIES=(
    "typescript"
    "@types/node"

    "@types/unzipper"
    "@smithy/types"
    "@smithy/util-stream"
    "jszip"
    "aws-sdk-client-mock"
    "aws-sdk-client-mock-vitest"
    "@vercel/ncc"

    "eslint"
    "@eslint/js"
    "@types/eslint__js"
    "eslint-config-flat-gitignore"
    "eslint-plugin-perfectionist"
    "@stylistic/eslint-plugin"
    "typescript-eslint"
    "@vitest/eslint-plugin"

    "vitest"
    "@vitest/coverage-v8"
)

if [[ ! -f package.json ]]; then
  echo "No package.json found. Are you executing the script in the right directory? Abort now" 1>&2
  exit 3
fi

echo "Cleanup"
rm -rf node_modules package-lock.json *.tgz coverage dist

NEW_PACKAGE_JSON=`mktemp package.json.XXXXXXXXXX`
chmod 0644 "$NEW_PACKAGE_JSON"
jq 'del(.dependencies, .devDependencies)' package.json > "$NEW_PACKAGE_JSON"
mv "$NEW_PACKAGE_JSON" package.json

echo ">> Installing dependencies"
for PKG in "${RUNTIME_DEPENDENCIES[@]}"; do
  echo " ● ${PKG}"
done
npm install "${RUNTIME_DEPENDENCIES[@]}"

echo ">> Installing development dependencies"
for PKG in "${BUILDTIME_DEPENDENCIES[@]}"; do
  echo " ● ${PKG}"
done
npm install --save-dev "${BUILDTIME_DEPENDENCIES[@]}"

echo ">> DONE"

echo ""
echo "We reinstalled all dependencies. You may want to run"
echo ""
echo "    git diff package.json"
echo ""
echo "now"
