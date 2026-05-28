# IntellMeet Deployment Guide

This guide describes how to deploy the **IntellMeet** application: the backend on **Render** and the frontend on **Vercel**.

---

## 🚀 Backend Deployment on Render

Render will host the Node.js Express server. We have added a `render.yaml` Blueprint file at the root of the project to automate the setup, but you can also deploy manually.

### Option A: Automatic Setup (Using render.yaml Blueprint)
1. Commit and push the changes (including the new `render.yaml` and modifications) to your GitHub repository.
2. Go to the [Render Dashboard](https://dashboard.render.com/).
3. Click **New +** and select **Blueprint**.
4. Connect your GitHub repository.
5. Render will automatically read `render.yaml` and configure the **intellmeet-backend** web service.
6. Provide the values for the following empty variables:
   - `MONGODB_URI`: Your MongoDB Atlas connection string.
   - `CLIENT_URL`: The URL of your Vercel deployment (e.g., `https://intellmeet-frontend.vercel.app`). *Make sure there is no trailing slash.*

### Option B: Manual Setup on Render
1. Go to the [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** and select **Web Service**.
3. Connect your GitHub repository.
4. Configure the Web Service settings:
   - **Name:** `intellmeet-backend`
   - **Root Directory:** `backend`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
5. Go to the **Environment** tab and add the following environment variables:

| Key | Example Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Run server in production mode |
| `PORT` | `5000` | Port for the Express server |
| `MONGODB_URI` | `mongodb+srv://...` | MongoDB connection string (from MongoDB Atlas) |
| `CLIENT_URL` | `https://your-app.vercel.app` | URL of the frontend deployment (no trailing slash) |
| `JWT_SECRET` | `your_long_random_jwt_secret` | Secure key for Access Token signatures |
| `JWT_REFRESH_SECRET` | `your_long_random_refresh_secret` | Secure key for Refresh Token signatures |
| `JWT_EXPIRES_IN` | `15m` | Lifetime of Access Tokens |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Lifetime of Refresh Tokens |

---

## 🎨 Frontend Deployment on Vercel

Vercel will host the static assets built from the Vite React frontend.

1. Go to the [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New** and select **Project**.
3. Import your GitHub repository.
4. In the configuration settings, modify the following:
   - **Framework Preset:** `Vite` (automatically detected)
   - **Root Directory:** Select/Type `frontend` (This is critical so Vercel builds from the `frontend` subfolder)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Expand the **Environment Variables** section and add the following keys:

| Key | Example Value | Description |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | `https://intellmeet-backend.onrender.com/api` | The deployed Render backend API URL |
| `VITE_SOCKET_URL` | `https://intellmeet-backend.onrender.com` | The deployed Render backend root URL (for Socket.io) |
| `VITE_APP_NAME` | `IntellMeet` | Name of the application |
| `VITE_APP_VERSION` | `1.0.0` | Version of the application |
| `VITE_ENV` | `production` | Environment mode for frontend |

6. Click **Deploy**. Vercel will build the frontend and provide a public URL.

---

## ⚠️ Important Deployment Details & Gotchas

> [!IMPORTANT]
> **CORS Matching (Trailing Slash Issue)**
> Ensure that the `CLIENT_URL` set on Render matches the Vercel URL *exactly* (including `https://` and without any trailing `/`). For example:
> - **Correct**: `https://intellmeet-frontend.vercel.app`
> - **Incorrect**: `https://intellmeet-frontend.vercel.app/`
> An incorrect trailing slash will cause CORS preflight checks to fail on requests from your browser.

> [!TIP]
> **Render Spin-Up Delay (Free Tier)**
> If you are using Render's Free tier, the backend container will automatically spin down (hibernate) after 15 minutes of inactivity. When a user first visits the page after hibernation, it may take 50–60 seconds for the backend to wake up and connect.

> [!NOTE]
> **No Redis Needed in Production**
> Although `redis` is listed in the dependencies, it is not used in the application logic. You do **not** need to spin up or pay for a Redis instance on Render.
