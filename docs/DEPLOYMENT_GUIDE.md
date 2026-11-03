# 🚀 Aziz AI Platform: Production Deployment Guide

This guide details the steps required to deploy the **Aziz AI Platform** (v1.0 Frozen RC1) to various environments, including local workstations, Docker containers, bare-metal Linux servers, and managed cloud providers.

---

## 1. Local Development Setup

### System Prerequisites
* **Node.js:** v18.0.0 or higher (v22+ recommended)
* **NPM:** v10.0.0 or higher
* **Git:** For workspace-level version control and SRE rollback routines.

### Step-by-Step Installation
1. Clone the repository to your local machine:
   ```bash
   git clone https://github.com/your-org/aziz-platform.git
   cd aziz-platform
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Initialize your local configuration by creating a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```
4. Configure your environment variables inside `.env` (see Section 5 below).
5. Start the local development server:
   ```bash
   npm run dev
   ```
   *The development server uses `tsx` to run the custom `server.ts` file, hosting the frontend (via Vite proxy middleware) and backend APIs on http://localhost:3000.*

---

## 2. Docker & Containerization

Using containerization guarantees environment consistency, isolating SRE sandboxing and tool executions within immutable containers.

### Production Dockerfile (`Dockerfile`)
Create this file in the root of your project:

```dockerfile
# --- Build Stage ---
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- Production Stage ---
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
# Install production-only dependencies
RUN npm ci --only=production
# Copy compiled assets from builder stage
COPY --from=builder /app/dist ./dist
# Expose the designated system port (Port 3000 is required by standard reverse proxying)
EXPOSE 3000
CMD ["npm", "start"]
```

### Docker Compose Configuration (`docker-compose.yml`)
For multi-container orchestrations, deploy the platform alongside standard service layers:

```yaml
version: '3.8'

services:
  aziz-platform:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: aziz_platform_prod
    restart: always
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID}
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock # Optional: if tools execute sibling Docker tasks
      - aziz-workspace:/app/workspace # Persistent workspace volume for SRE actions

volumes:
  aziz-workspace:
```

---

## 3. Production Linux & PM2 (Bare-Metal / VM)

Deploying directly on systems like Ubuntu or Debian without containers is fully supported using Node's process manager (**PM2**).

### PM2 Process Management
1. Install PM2 globally:
   ```bash
   sudo npm install -g pm2
   ```
2. Create an ecosystem configuration file (`ecosystem.config.cjs`):
   ```javascript
   module.exports = {
     apps: [
       {
         name: "aziz-platform-prod",
         script: "./dist/server.cjs",
         instances: "max", // Scale to multiple CPU cores
         exec_mode: "cluster", // Cluster mode for zero-downtime reloads
         env: {
           NODE_ENV: "production",
           PORT: 3000
         }
       }
     ]
   };
   ```
3. Run the compiled application under PM2:
   ```bash
   npm run build
   ```
   ```bash
   pm2 start ecosystem.config.cjs
   ```
4. Enable PM2 to boot automatically on system restarts:
   ```bash
   pm2 startup
   pm2 save
   ```

---

## 4. Reverse Proxying with Nginx & SSL Setup

A reverse proxy serves as the public entry gate, handling SSL/TLS termination and preventing direct exposure of the Node.js Express server to the internet.

### Production Nginx Configuration (`/etc/nginx/sites-available/aziz.conf`)

```nginx
server {
    listen 80;
    server_name aziz.yourdomain.com;
    
    # Redirect all HTTP traffic to HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name aziz.yourdomain.com;

    # SSL Certificates (Managed via Let's Encrypt Certbot)
    ssl_certificate /etc/letsencrypt/live/aziz.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/aziz.yourdomain.com/privkey.pem;

    # Optimal SSL Configurations
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_stapling on;
    ssl_stapling_verify on;

    # Max upload limit for context uploads
    client_max_body_size 15M;

    # Static Assets serving (Optional Optimization)
    location /assets/ {
        alias /var/www/aziz-platform/dist/assets/;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    # API and Websocket Proxying
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        
        # Connection Headers for Websocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Standard Proxy Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts for long SRE/LLM requests
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
```

### Let's Encrypt Certbot SSL Installation
```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d aziz.yourdomain.com
```

---

## 5. Production Environment Variables Profile

Create `.env.production` (or inject these keys directly into your container manager):

```env
# Node & Runtime Settings
NODE_ENV=production
PORT=3000

# Gemini API Integration
# Secure, server-side secret key from Google AI Studio
GEMINI_API_KEY=AIzaSy...

# Firebase & Authentication Profiles (Secure)
FIREBASE_PROJECT_ID=aziz-studio-production
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@aziz-studio-production.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC..."

# Operational Mail Gateway
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxx
ALERT_RECIPIENT_EMAIL=sre-team@yourdomain.com
```

---

## 6. SRE Maintenance Operations: Backups, Upgrades, & Rollbacks

### Workspace and State Backup Strategy
The system consists of two primary operational datasets:
1. **Durable Database State (Firestore):**
   * Firestore automatically manages replication and clustering.
   * Run manual daily exports via gcloud CLI to a Google Cloud Storage (GCS) Bucket:
     ```bash
     gcloud firestore export gs://aziz-backups-bucket/daily-backups
     ```
2. **Local Workspace Code Files (SRE Workspace):**
   * Since the workspace operates under Git, backing up codebases simply requires syncing code-repos.
   * Workspace directories can be compressed and exported daily to an offsite S3-compliant target:
     ```bash
     tar -czf /backups/workspace-$(date +%F).tar.gz /app/workspace
     ```

### Upgrade Strategy (Zero-Downtime)
We use a **Blue-Green** or rolling deployment strategy:
1. Compile the new version of static assets and the backend bundle:
   ```bash
   git pull origin main
   npm ci
   npm run build
   ```
2. When deploying under **PM2**, trigger a zero-downtime graceful cluster reload:
   ```bash
   pm2 reload aziz-platform-prod
   ```
   *This commands reloads instances one by one, ensuring client API requests are never dropped.*

### Rollback Procedure
If the upgrade introduces a critical defect, SREs can execute an instant rollback:
1. Revert to the last stable Git tag:
   ```bash
   git checkout tags/v1.0.0-rc1
   npm ci
   npm run build
   ```
2. Force-reload the cluster instances:
   ```bash
   pm2 reload aziz-platform-prod
   ```
3. If using container deployments (Cloud Run / Kubernetes), simply route traffic back to the previous stable revision ID via the cloud console, achieving instantaneous sub-second rollbacks.
