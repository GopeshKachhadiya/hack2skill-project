# 🚀 Firebase & Cloud Run Deployment Guide

This guide will walk you through deploying your **Vite + React frontend** to Firebase Hosting and your **FastAPI backend** to Google Cloud Run.

---

## 🛠 Prerequisites

1.  **Firebase Account**: Go to [Firebase Console](https://console.firebase.google.com/) and create a project.
2.  **Node.js**: Installed on your machine.
3.  **Firebase CLI**: Install globally via npm:
    ```bash
    npm install -g firebase-tools
    ```
4.  **Google Cloud SDK**: [Download and install here](https://cloud.google.com/sdk/docs/install).

---

## 🌐 PART 1: Frontend Deployment (Firebase Hosting)

### 1. Login to Firebase
```bash
firebase login
```

### 2. Build your React app
Navigate to the frontend folder and run the build:
```bash
cd frontend
npm install
npm run build
```

### 3. Initialize Firebase
Still in the `frontend` folder:
```bash
firebase init hosting
```
- **Project Setup**: Select "Use an existing project" and choose your project.
- **Public Directory**: Type `dist` (Vite uses `dist` by default).
- **Configure as a single-page app?**: Yes (`y`).
- **Set up automatic builds/deploys with GitHub?**: No (`n`).
- **File dist/index.html already exists. Overwrite?**: No (`n`).

### 4. Deploy
```bash
firebase deploy --only hosting
```
**Take note of your Hosting URL** (e.g., `https://your-project.web.app`).

---

## 🐍 PART 2: Backend Deployment (Google Cloud Run)

*Note: Your Dockerfile has already been updated to port 8080 for compatibility.*

### 1. Login to Google Cloud
```bash
gcloud auth login
gcloud config set project [YOUR_PROJECT_ID]
```

### 2. Deploy from Source
Navigate to the `backend` folder and deploy:
```bash
cd ../backend
gcloud run deploy backend-api --source . --platform managed --region us-central1 --allow-unauthenticated
```
- When asked for a service name, press enter for `backend-api`.
- When asked to allow unauthenticated invocations, type `y`.

**Copy the Service URL** provided at the end (e.g., `https://backend-api-xxxx.a.run.app`).

---

## 🔗 PART 3: Connect Frontend to Backend

### 1. Update Frontend Environment Variables
In your `frontend` folder, create a file named `.env` and add your backend URL:
```text
VITE_API_BASE_URL=https://backend-api-xxxx.a.run.app
```

### 2. Re-build and Re-deploy Frontend
```bash
cd ../frontend
npm run build
firebase deploy --only hosting
```

---

## 💡 Common Issues

- **CORS Errors**: Ensure your backend `main.py` allows requests from your Firebase URL. (Currently set to `*` which is fine for hackathons).
- **Port Errors**: Cloud Run MUST use port `8080`. Ensure `Dockerfile` CMD is `["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]`.
- **Firebase CLI not found**: Restart your terminal after installing `firebase-tools`.
