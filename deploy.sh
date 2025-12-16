#!/bin/bash

# 🚀 Quick Deploy Script for Đọc truyện Audio

echo "========================================="
echo "🚀 Đọc truyện Audio Deployment Script"
echo "========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}Vercel CLI not found. Installing...${NC}"
    npm install -g vercel
fi

# Ask for backend URL
echo -e "${YELLOW}Enter your backend URL (e.g., https://your-app.onrender.com):${NC}"
read -r BACKEND_URL

if [ -z "$BACKEND_URL" ]; then
    echo -e "${RED}Backend URL is required!${NC}"
    exit 1
fi

# Update config.ts temporarily
echo -e "${GREEN}Updating config...${NC}"
echo "EXPO_PUBLIC_TTS_URL=$BACKEND_URL" > .env.local

# Build for web
echo -e "${GREEN}Building for web...${NC}"
npx expo export:web

if [ $? -ne 0 ]; then
    echo -e "${RED}Build failed!${NC}"
    exit 1
fi

# Deploy to Vercel
echo -e "${GREEN}Deploying to Vercel...${NC}"
vercel --prod --env EXPO_PUBLIC_TTS_URL="$BACKEND_URL"

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}=========================================${NC}"
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    echo -e "${GREEN}=========================================${NC}"
    echo ""
    echo -e "Your app is now live! 🎉"
    echo ""
    echo -e "Backend: ${YELLOW}$BACKEND_URL${NC}"
    echo -e "Frontend: Check Vercel dashboard for URL"
    echo ""
else
    echo -e "${RED}Deployment failed!${NC}"
    exit 1
fi

