#!/bin/bash

echo "🔧 Fixing 404 errors for GitHub Pages deployment..."

# Build the project with proper base path
echo "📦 Building project for GitHub Pages..."
npm run build

# Ensure .nojekyll file exists
echo "📝 Ensuring .nojekyll file exists..."
touch dist/.nojekyll

# Add CNAME file if needed (uncomment if using custom domain)
# echo "your-domain.com" > dist/CNAME

# Check if dist directory has files
echo "📋 Checking build output..."
ls -la dist/

# Add all changes
echo "📋 Adding changes to git..."
git add .

# Commit changes
echo "💾 Committing deployment fix..."
git commit -m "Fix 404 errors: Ensure proper GitHub Pages deployment

- Build with correct base path for GitHub Pages
- Add .nojekyll file to prevent Jekyll processing
- Ensure all assets are properly built
- Fix routing for production deployment"

# Push to GitHub
echo "🚀 Pushing to GitHub..."
git push origin main

echo "✅ Deployment fix complete!"
echo "🌐 Your app should be available at: https://selinapps.github.io/bias-to-profit/"
echo "⏳ GitHub Pages deployment may take 2-5 minutes to complete."
echo "🔍 If you still see 404 errors, check the browser console for specific missing files."
