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

# Check current deployment count and clean up if needed
DEPLOYMENT_COUNT=$(clasp deployments 2>&1 | grep -c '@[0-9]')
echo "📊 Current deployments: $DEPLOYMENT_COUNT"

if [ "$DEPLOYMENT_COUNT" -ge 20 ]; then
  echo "🧹 Cleaning up old deployments (keeping 15 most recent)..."
  
  # Get all versioned deployments (exclude @HEAD), sort by version number, get oldest 5
  # Format: - AKfycby... @1 - Description
  OLD_DEPLOYMENTS=$(clasp deployments 2>&1 | grep '@[0-9]' | awk '{print $3, $2}' | sort -t@ -k2 -n | head -5 | awk '{print $2}')
  
  for DEPLOYMENT_ID in $OLD_DEPLOYMENTS; do
    echo "  Removing old deployment: $DEPLOYMENT_ID"
    clasp undeploy "$DEPLOYMENT_ID" 2>&1 | grep -v "Undeployed" || true
  done
  
  echo "✅ Cleanup complete"
  echo ""
fi

DEPLOY_OUTPUT=$(clasp deploy --description "$DESCRIPTION" 2>&1)

if [ $? -ne 0 ]; then
  echo "❌ Failed to create deployment"
  echo "$DEPLOY_OUTPUT"
  exit 1
fi

# Extract version number from output (format: "Deployed <ID> @<version>")
VERSION=$(echo "$DEPLOY_OUTPUT" | grep -o '@[0-9]\+' | head -1 | tr -d '@')

# If no version found, check if deployment was successful
if [ -z "$VERSION" ]; then
  echo "⚠️  Warning: Could not extract version number from deployment output"
  echo "Output was: $DEPLOY_OUTPUT"
  VERSION="unknown"
fi

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
