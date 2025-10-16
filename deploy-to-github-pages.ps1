# Deploy to GitHub Pages PowerShell script
Write-Host "🚀 Starting deployment to GitHub Pages..." -ForegroundColor Green

# Build the project
Write-Host "📦 Building the project..." -ForegroundColor Yellow
npm run build

# Add .nojekyll file to prevent Jekyll processing
Write-Host "📝 Adding .nojekyll file..." -ForegroundColor Yellow
New-Item -Path "dist\.nojekyll" -ItemType File -Force

# Check if we're in the right directory
if (-not (Test-Path "dist")) {
    Write-Host "❌ Error: dist directory not found. Make sure you're in the project root." -ForegroundColor Red
    exit 1
}

# Add all changes
Write-Host "📋 Adding changes to git..." -ForegroundColor Yellow
git add .

# Commit the build
Write-Host "💾 Committing build..." -ForegroundColor Yellow
git commit -m "Deploy: Update build assets for GitHub Pages"

# Push to trigger GitHub Actions deployment
Write-Host "🚀 Pushing to GitHub to trigger deployment..." -ForegroundColor Yellow
git push origin main

Write-Host "✅ Deployment initiated! Check GitHub Actions for progress." -ForegroundColor Green
Write-Host "🌐 Your site will be available at: https://selinapps.github.io/bias-to-profit/" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 Note: If you're still seeing 404 errors:" -ForegroundColor Yellow
Write-Host "   1. Wait 2-3 minutes for GitHub Actions to complete" -ForegroundColor White
Write-Host "   2. Clear your browser cache (Ctrl+Shift+R)" -ForegroundColor White
Write-Host "   3. Check the GitHub Actions tab in your repository" -ForegroundColor White