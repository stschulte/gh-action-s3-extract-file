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

# List of runtime dependencies
RDEPS=(
  "@actions/core"
  "@aws-sdk/client-s3"
  "unzipper"
)

# List of buildtime dependencies or developer
# dependencies
BDEPS=(
    "@smithy/types"
    "@smithy/util-stream"
    "@types/unzipper"
    "aws-sdk-client-mock"
    "aws-sdk-client-mock-vitest"
    "@typescript-eslint/eslint-plugin"
    "@typescript-eslint/parser"
    "@vercel/ncc"
    "eslint"
    "eslint-plugin-github"
    "js-yaml"
    "prettier"
    "typescript"
    "vitest"
    "@vitest/coverage-v8"
    "jszip"
)

if [[ ! -f package.json ]]; then
  echo "No package.json found. Are you executing the script in the right directory? Abort now" 1>&2
  exit 3
fi

echo "Cleanup"
rm -rf node_modules package-lock.json coverage dist* lib*
sed -i \
  -e '/^  "dependencies"/,/^  \}/D' \
  -e '/^  "devDependencies"/,/^  \}/D' \
  -e 's/^\(  "homepage".*\),$/\1/' \
  package.json

echo ">> Installing runtime dependencies"
for D in "${RDEPS[@]}"; do
  echo " * ${D}"
done
npm install "${RDEPS[@]}"

echo ">> Installing buildtime dependencies"
for D in "${BDEPS[@]}"; do
  echo " * ${D}"
done
npm install --save-dev "${BDEPS[@]}"

echo ">> DONE"
