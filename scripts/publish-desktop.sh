#!/usr/bin/env bash
set -euo pipefail

DMG_PATH="${1:-}"
COMMIT_MSG="${2:-update}"

if [[ -z "$DMG_PATH" ]]; then
  echo "Uso: scripts/publish-desktop.sh /caminho/para/Merse-arm64.dmg \"mensagem commit\""
  exit 1
fi

if [[ ! -f "$DMG_PATH" ]]; then
  echo "Arquivo .dmg nao encontrado: $DMG_PATH"
  exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI (gh) nao encontrado. Instale com: brew install gh"
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "Voce precisa fazer login no gh primeiro: gh auth login"
  exit 1
fi

# Garante que .dmg nao fica versionado no repo
if ! rg -q "\*\.dmg" .gitignore; then
  echo "*.dmg" >> .gitignore
fi

if git ls-files --error-unmatch "$DMG_PATH" >/dev/null 2>&1; then
  git rm --cached "$DMG_PATH"
fi

# Commit e push do site
if [[ -n "$(git status --porcelain)" ]]; then
  git add .
  if ! git diff --cached --quiet; then
    git commit -m "$COMMIT_MSG"
  fi
  git push
fi

# Cria release e sobe o .dmg com nome fixo
TAG="desktop-$(date +%Y.%m.%d-%H%M)"
TITLE="Merse Desktop ${TAG#desktop-}"
NOTES="Release automatizado do app desktop."

# Usa nome fixo no asset para manter o link /latest/download/Merse-arm64.dmg
if gh release view "$TAG" >/dev/null 2>&1; then
  gh release upload "$TAG" "$DMG_PATH#Merse-arm64.dmg" --clobber
else
  gh release create "$TAG" "$DMG_PATH#Merse-arm64.dmg" --title "$TITLE" --notes "$NOTES"
fi

echo "Pronto. Link fixo: https://github.com/3Mgalaxia/merse/releases/latest/download/Merse-arm64.dmg"
