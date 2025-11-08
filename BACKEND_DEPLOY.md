# Backend Deployment to Render.com

## Quick Deployment Steps

### Step 1: Commit Your Changes
```bash
cd /home/aman/volksw
git add render.yaml
git add project/backend/Procfile project/backend/RENDER_DEPLOY.txt
git commit -m "Configure Render deployment with rootDir"
git push origin main
```

### Step 2: Deploy on Render.com

1. **Go to Render.com**
   - Visit: https://render.com
   - Sign in with GitHub

2. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Connect GitHub account (if not already)
   - Select repository: `Amxn-2/VolkswagenDasAuto`
   - Click "Connect"

3. **Render Auto-Detection**
   - Render will automatically detect `render.yaml`
   - It will pre-fill:
     - Name: `volksw-backend`
     - Root Directory: `project/backend`
     - Build Command: `pip install -r requirements.txt`
     - Start Command: `python main.py`

4. **Add Environment Variables**
   Click "Environment" tab and add:

   **REQUIRED:**
   ```
   NEON_DATABASE_URL=postgresql://neondb_owner:npg_zKgsTEa31dVe@ep-shy-cake-adyoetlj-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
   ```

   **OPTIONAL (if you use them):**
   ```
   REDIS_URL=redis://default:F5VBLG2iqO8IJ3zXHgyGEf9MvotSeKSG@redis-12179.crce179.ap-south-1-1.ec2.redns.redis-cloud.com:12179
   
   MQTT_ENABLED=true
   MQTT_BROKER_HOST=0f90f5c178024610b2fd08ad70412434.s1.eu.hivemq.cloud
   MQTT_BROKER_PORT=8883
   MQTT_USERNAME=Archis17
   MQTT_PASSWORD=Archis1708
   MQTT_CLIENT_ID=hazard-eye-backend
   
   GEOFENCE_DEFAULT_RADIUS=5000
   ```

5. **Deploy**
   - Click "Create Web Service"
   - Wait 2-5 minutes for first deployment
   - Your backend will be live at: `https://volksw-backend.onrender.com`

### Step 3: Verify Deployment

1. **Health Check**
   ```
   https://your-service.onrender.com/health
   ```
   Should return: `{"status": "ok"}`

2. **API Docs**
   ```
   https://your-service.onrender.com/docs
   ```
   Should show FastAPI Swagger UI

3. **WebSocket**
   ```
   wss://your-service.onrender.com/ws
   ```
   Should accept WebSocket connections

## Important Notes

- ✅ `render.yaml` is at root (required by Render)
- ✅ `rootDir: project/backend` tells Render to use backend directory
- ✅ Frontend files are in repo but won't affect backend deployment
- ✅ Model files (yolov12.pt, yolov8n.pt) are included in repo
- ⚠️ Free tier spins down after 15 min inactivity
- 💡 Use UptimeRobot to ping `/health` every 10 min to keep alive

## Troubleshooting

- **Build fails**: Check logs in Render dashboard
- **Model files missing**: Ensure *.pt files are committed to git
- **Database connection fails**: Verify NEON_DATABASE_URL is correct
- **Port errors**: Render sets PORT automatically, don't override it

## Next Steps (After Backend is Live)

1. Note your backend URL: `https://volksw-backend.onrender.com`
2. Deploy frontend to Vercel
3. Set `VITE_API_BASE_URL` in Vercel to your Render backend URL

