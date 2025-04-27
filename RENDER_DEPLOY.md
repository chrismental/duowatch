# Deploying to Render

This guide will help you deploy your DuoWatch application to Render.com.

## Step 1: Create a Repository on GitHub

1. Create a new repository on GitHub
2. Push your code to the repository (make sure to include all files, especially the custom render scripts)

## Step 2: Create a New Web Service on Render

1. Sign up/log in to [Render.com](https://render.com)
2. From your dashboard, click **New** and select **Web Service**
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: duowatch (or your preferred name)
   - **Region**: Choose a region close to your users
   - **Branch**: main (or your default branch)
   - **Runtime**: Node
   - **Build Command**: `./render-build.sh`
   - **Start Command**: `node render-start.js`
   - **Plan**: Free

## Step 3: Add a PostgreSQL Database

1. From your Render dashboard, click **New** and select **PostgreSQL**
2. Configure the database:
   - **Name**: duowatch-db (or your preferred name)
   - **Region**: Choose the same region as your web service
   - **PostgreSQL Version**: 14 (default)
   - **Plan**: Free

## Step 4: Link Database to Web Service

1. Go to your web service's **Environment** tab
2. Add the following environment variables:
   - **Key**: `NODE_ENV` | **Value**: `production`
   - **Key**: `YOUTUBE_API_KEY` | **Value**: Your YouTube API key
   - **Key**: `DATABASE_URL` | **Value**: Find this in your database dashboard (Internal Database URL)

## Step 5: Deploy

1. Click **Manual Deploy** > **Deploy latest commit**
2. Wait for the deployment to complete
3. Your app will be available at `https://your-app-name.onrender.com`

## Troubleshooting

If you encounter build issues:

1. Check the build logs for specific errors
2. Make sure all files are correctly committed to GitHub, including:
   - render-build.sh
   - render-pre-build.sh
   - render-prod-build.js
   - render-start.js
   - render.yaml
3. Verify your environment variables are set correctly
4. If you encounter the `Cannot find package '@vitejs/plugin-react'` error:
   - Make sure the render-pre-build.sh script has execution permissions (`chmod +x render-pre-build.sh`)
   - Try manually installing the dependencies by adding a custom build command: `npm install --no-save vite @vitejs/plugin-react && ./render-build.sh`

## Important Notes

- The free tier of Render has some limitations:
  - Web services spin down after 15 minutes of inactivity
  - Databases have a 90-day retention policy
- For production use, consider upgrading to a paid plan