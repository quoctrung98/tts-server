# ⚡ Quick Deploy (5 minutes)

## Step 1: Deploy Backend (2 minutes)

1. Go to https://render.com
2. Sign up with GitHub
3. Click "New +" → "Web Service"
4. Connect this repository
5. Configure:
   - **Name**: `appreader-tts`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python tts-server.py`
   - **Plan**: Free
6. Click "Create Web Service"
7. **Copy your backend URL**: `https://appreader-tts.onrender.com`

## Step 2: Deploy Frontend (3 minutes)

### Option A: Vercel (Recommended)

1. Go to https://vercel.com
2. Sign up with GitHub
3. Click "Add New..." → "Project"
4. Import this repository
5. Configure:
   - **Framework Preset**: Other
   - **Build Command**: `npx expo export:web`
   - **Output Directory**: `dist`
6. Add Environment Variable:
   - **Key**: `EXPO_PUBLIC_TTS_URL`
   - **Value**: `https://appreader-tts.onrender.com` (your backend URL)
7. Click "Deploy"
8. Done! Your app is live at `https://your-app.vercel.app`

### Option B: One Command (with Vercel CLI)

```bash
# Install Vercel CLI
npm install -g vercel

# Set your backend URL
export BACKEND_URL="https://appreader-tts.onrender.com"

# Build
npm run build

# Deploy
vercel --prod --env EXPO_PUBLIC_TTS_URL="$BACKEND_URL"
```

## That's it! 🎉

Your app is now live!

**Test it:**
```
https://your-app.vercel.app/?chapter=https://truyenfull.vision/truyen/chuong-1/
```

## Keep Backend Awake (Optional)

Render free tier sleeps after 15 mins of inactivity.

**Solution: Use UptimeRobot**
1. Go to https://uptimerobot.com (free)
2. Add New Monitor:
   - **Type**: HTTP(s)
   - **URL**: `https://appreader-tts.onrender.com/health`
   - **Interval**: 10 minutes
3. Save

Now your backend stays awake! ⚡

## Troubleshooting

**Build fails?**
- Check build logs in Vercel/Render dashboard
- Ensure all dependencies are in requirements.txt / package.json

**CORS errors?**
- Check if backend URL is correct in Vercel environment variables
- Backend has CORS enabled by default

**Backend slow?**
- First request after sleep takes ~30s (normal for Render free tier)
- Use UptimeRobot to keep it awake
- Or upgrade to paid plan ($7/month)

## Cost

**Total: $0/month** 💰

- Vercel: Free
- Render: Free (750 hours/month)
- UptimeRobot: Free (50 monitors)

## Need Help?

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed instructions.

