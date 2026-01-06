#!/bin/bash

# Update the ObservePoint Toolbelt Library
# Usage: ./scripts/update-library.sh "Description of changes"

if [ -z "$1" ]; then
  echo "Usage: ./scripts/update-library.sh \"Description of changes\""
  exit 1
fi

DESCRIPTION="$1"

echo "🔄 Updating ObservePoint Toolbelt Library"
echo ""

# Auto-generate customer template files BEFORE deploying
echo "📝 Auto-generating customer template files..."
./scripts/generate-customer-template.sh

if [ $? -ne 0 ]; then
  echo "❌ Failed to generate customer template"
  exit 1
fi

echo ""
cd src

echo "📤 Pushing code changes..."
clasp push

if [ $? -ne 0 ]; then
  echo "❌ Failed to push code"
  exit 1
fi

echo ""
echo "🚀 Creating new deployment..."
DEPLOY_OUTPUT=$(clasp deploy --description "$DESCRIPTION" 2>&1)

if [ $? -ne 0 ]; then
  echo "❌ Failed to create deployment"
  echo "$DEPLOY_OUTPUT"
  exit 1
fi

# Extract version number from output
VERSION=$(echo "$DEPLOY_OUTPUT" | grep -o '@[0-9]*' | head -1 | tr -d '@')

echo ""
echo "✅ Library updated successfully!"
echo "📦 New version: $VERSION"
echo "📝 Description: $DESCRIPTION"
echo ""
echo "📋 Next steps:"
echo "1. Notify users of the new version"
echo "2. Users can update in their Apps Script: Libraries > ObservePointTools > Select version $VERSION"
echo ""
echo "View all versions:"
echo "  cd src && clasp deployments"
echo ""
echo "Version history saved to CHANGELOG.md"

# Append to changelog
cd ..
DATE=$(date +"%Y-%m-%d %H:%M")
echo "" >> CHANGELOG.md
echo "## Version $VERSION - $DATE" >> CHANGELOG.md
echo "$DESCRIPTION" >> CHANGELOG.md

# Update appsscript.json to reference new version
echo ""
echo "📝 Updating customer template version..."
TEMPLATE_FILE="customer-template/appsscript.json"
if [ -f "$TEMPLATE_FILE" ]; then
  sed -i.bak "s/\"version\": \"[0-9]*\"/\"version\": \"$VERSION\"/" "$TEMPLATE_FILE"
  rm "${TEMPLATE_FILE}.bak" 2>/dev/null
  echo "✅ Updated $TEMPLATE_FILE to version $VERSION"
else
  echo "⚠️  Template file not found: $TEMPLATE_FILE"
fi

echo ""
echo "✅ Customer template is ready to copy!"
