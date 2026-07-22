#!/bin/bash
set -e  # Exit on error

REPO="peterkahumu/Cinestream"
LABELS_FILE=".github/scripts/labels.json"

echo "🏷️  Cinestream Label Manager"
echo "============================"
echo ""

# Check if gh is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed"
    echo "   Install it: https://cli.github.com/"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated with GitHub"
    echo "   Run: gh auth login"
    exit 1
fi

# Check if labels.json exists
if [ ! -f "$LABELS_FILE" ]; then
    echo "❌ Labels file not found: $LABELS_FILE"
    exit 1
fi

# ─── NUKE EXISTING LABELS ──────────────────────────────
echo "🗑️  Deleting all existing labels..."
echo ""

# Get all current labels and delete them
gh label list --repo "$REPO" --json name --jq '.[].name' | while read -r label; do
    echo "   Deleting: $label"
    gh label delete "$label" --repo "$REPO" --yes 2>/dev/null || true
done

echo ""
echo "✅ All existing labels deleted!"
echo ""

# ─── CREATE NEW LABELS ─────────────────────────────────
echo "🏗️  Creating new labels from $LABELS_FILE..."
echo ""

# Count total labels
TOTAL=$(jq length "$LABELS_FILE")
SUCCESS=0
FAILED=0

# FIXED: Use process substitution to avoid subshell issue
while read -r label; do
    name=$(echo "$label" | jq -r '.name')
    color=$(echo "$label" | jq -r '.color')
    description=$(echo "$label" | jq -r '.description')
    
    SUCCESS=$((SUCCESS + 1))
    printf "[%2d/%2d] Creating: %-25s" "$SUCCESS" "$TOTAL" "$name"
    
    if gh label create "$name" \
        --color "$color" \
        --description "$description" \
        --repo "$REPO" \
        --force 2>/dev/null; then
        echo " ✅"
    else
        echo " ❌"
        FAILED=$((FAILED + 1))
    fi
done < <(jq -c '.[]' "$LABELS_FILE")

echo ""
echo "============================"
echo "✅ Done! $SUCCESS created, $FAILED failed."
echo ""

# ─── SHOW SUMMARY ──────────────────────────────────────
echo "📊 Current labels in $REPO:"
echo ""
gh label list --repo "$REPO" --limit 50
