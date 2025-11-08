#!/bin/bash
# Quick Backend Deployment Script

echo "🚀 Backend Deployment to Render.com"
echo "===================================="
echo ""

# Check git status
if ! git diff-index --quiet HEAD -- 2>/dev/null; then
    echo "📝 Staging changes..."
    git add render.yaml project/backend/Procfile project/backend/RENDER_DEPLOY.txt BACKEND_DEPLOY.md RENDER_EXPLANATION.txt
    
    echo ""
    echo "📦 Ready to commit. Changes:"
    git status --short
    echo ""
    
    read -p "Commit and push to GitHub? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git commit -m "Configure Render deployment with rootDir for backend"
        git push origin main
        echo ""
        echo "✅ Pushed to GitHub!"
        echo ""
    else
        echo "⚠️  Skipped commit. Please commit manually before deploying."
        exit 1
    fi
else
    echo "✅ No uncommitted changes"
fi

echo ""
echo "🌐 Next: Deploy on Render.com"
echo "=============================="
echo ""
echo "1. Go to: https://render.com"
echo "2. Sign in with GitHub"
echo "3. Click 'New +' → 'Web Service'"
echo "4. Connect repository: Amxn-2/VolkswagenDasAuto"
echo "5. Render will auto-detect render.yaml ✅"
echo "6. Add environment variables (see BACKEND_DEPLOY.md)"
echo "7. Click 'Create Web Service'"
echo ""
echo "📖 Full instructions: See BACKEND_DEPLOY.md"
echo ""
echo "Your backend will be available at:"
echo "  https://volksw-backend.onrender.com"
echo ""

