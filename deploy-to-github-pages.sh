#!/bin/bash

# Deploy to GitHub Pages script
echo "🚀 Starting deployment to GitHub Pages..."

# Build the project
echo "📦 Building the project..."
npm run build

# Add .nojekyll file to prevent Jekyll processing
echo "📝 Adding .nojekyll file..."
touch dist/.nojekyll

# Check if we're in the right directory
if [ ! -d "dist" ]; then
    echo "❌ Error: dist directory not found. Make sure you're in the project root."
    exit 1
fi

# Add all changes
echo "📋 Adding changes to git..."
git add .

# Commit the build
echo "💾 Committing build..."
git commit -m "Deploy: Update build assets for GitHub Pages

- Updated build with latest changes
- Added .nojekyll file for proper GitHub Pages deployment
- Fixed 404 errors for dynamically imported modules"

# Push to trigger GitHub Actions deployment
echo "🚀 Pushing to GitHub to trigger deployment..."
git push origin main

echo "✅ Deployment initiated! Check GitHub Actions for progress."
echo "🌐 Your site will be available at: https://selinapps.github.io/bias-to-profit/"
echo ""
echo "📝 Note: If you're still seeing 404 errors:"
echo "   1. Wait 2-3 minutes for GitHub Actions to complete"
echo "   2. Clear your browser cache (Ctrl+Shift+R or Cmd+Shift+R)"
echo "   3. Check the GitHub Actions tab in your repository for deployment status"