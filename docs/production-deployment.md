# EscrowLance Production Deployment Guide

This guide covers production deployment for:

- Frontend: Vercel
- Backend API: Render
- Database: MongoDB Atlas
- Smart contract: Sepolia via Hardhat
- File uploads: Cloudinary
- RPC provider: Infura or Alchemy

## 1) What was changed in code

### Frontend

- API is env-driven through `frontend/src/config/env.js`
- Axios now uses:
  - env base URL
  - timeout
  - credentials
  - normalized error messages
- Wallet hook now includes:
  - supported network checks
  - explicit MetaMask error mapping
  - add-network flow for Sepolia
- Milestone submit UI now shows transaction state progression
- Vercel SPA fallback config added in `frontend/vercel.json`
- Production build scripts added in `frontend/package.json`

### Backend

- Production security middleware enabled:
  - helmet
  - compression
  - express-rate-limit
  - express-mongo-sanitize
  - hpp
  - string sanitization via `xss`
- Request limits and API rate limiting configured
- Startup env validation and graceful shutdown added
- MongoDB Atlas connection options hardened
- File uploads migrated from Pinata to Cloudinary
- Upload size and MIME validation added
- Centralized error middleware now handles common production errors more safely
- Render deployment file added in `render.yaml`

### Blockchain / Hardhat

- Hardhat config extended for Sepolia + Etherscan verification
- Deploy script now writes `blockchain/deployments/<network>.json`
- Verify script added
- ABI sync script added to sync ABI into backend and frontend
- New combined deploy + verify + ABI sync command added

### CI/CD

- Frontend GitHub Actions workflow added
- Backend GitHub Actions workflow added

## 2) Required environment variables

Use these example files:

- `frontend/.env.example`
- `backend/.env.example`
- `blockchain/.env.example`

Key notes:

- Use a strong random `JWT_SECRET` (minimum 32 chars)
- Never commit `PRIVATE_KEY`, Atlas credentials, Cloudinary secrets
- Set `CLIENT_URL` on backend to your Vercel domain

## 3) MongoDB Atlas setup

1. Create Atlas project and cluster.
2. Create DB user with strong password.
3. Allow network access:
   - for testing: `0.0.0.0/0`
   - for production: restrict to Render egress if available.
4. Get connection URI and set `MONGO_URI` in Render backend env.
5. Optional: set `MONGO_DB_NAME` to `chainescrow`.

## 4) Cloudinary setup

1. Create Cloudinary account.
2. From dashboard, copy:
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
3. Add to Render backend env.
4. Optional folder: `CLOUDINARY_FOLDER=escrowlance/proofs`.

Uploads now return Cloudinary URL as `ipfsHash` for backward compatibility with existing frontend flow.

## 5) Smart contract deployment (Sepolia)

### Prepare

1. Fund deployer wallet with Sepolia ETH.
2. Set in `blockchain/.env`:
   - `SEPOLIA_RPC_URL` from Infura/Alchemy
   - `PRIVATE_KEY`
   - `ETHERSCAN_API_KEY`

### Deploy + verify + sync ABI

Run from repo root:

~~~bash
npm run deploy:contract:sepolia
~~~

This executes:

- `deploy:sepolia`
- `verify:sepolia`
- `sync:abi`

Deployment artifact is written to:

- `blockchain/deployments/sepolia.json`

### Wire deployed address

Set the deployed address in:

- `backend/.env` as `CHAINESCROW_CONTRACT_ADDRESS`
- `frontend/.env` as `VITE_CHAINESCROW_CONTRACT_ADDRESS`

Then redeploy backend + frontend.

## 6) Backend deploy on Render

### Option A: Blueprint (recommended)

1. Push repository to GitHub.
2. In Render, create new Blueprint.
3. Select repo and `render.yaml` will provision service.
4. Fill all `sync: false` env vars in Render dashboard.

### Option B: Manual Web Service

1. New Web Service from repo.
2. Root directory: `backend`
3. Build command: `npm install`
4. Start command: `npm run start`
5. Set env vars from `backend/.env.example`.
6. Confirm health endpoint:

~~~
https://<your-render-service>/health
~~~

## 7) Frontend deploy on Vercel

1. Import repo in Vercel.
2. Root directory: `frontend`
3. Build command: `npm run vercel-build`
4. Output directory: `dist`
5. Add frontend env vars from `frontend/.env.example`.
6. Deploy.

`frontend/vercel.json` already includes SPA rewrite to `index.html`.

## 8) Domain and SSL/HTTPS

### Backend (Render)

- Render provides HTTPS by default.
- If using custom domain, add CNAME to Render and verify TLS issued.

### Frontend (Vercel)

- Vercel provides HTTPS by default.
- Add custom domain in Vercel and update DNS records.

### CORS

Set backend `CLIENT_URL` to include deployed frontend origin(s), example:

~~~
https://app.yourdomain.com,https://your-vercel-project.vercel.app
~~~

## 9) Security checklist

- Secrets are in env vars only, never in repository.
- `.gitignore` blocks env files and sensitive key formats.
- Password hashing is implemented with bcrypt in `backend/src/models/User.js`.
- API hardening enabled:
  - helmet
  - rate limiting
  - mongo sanitization
  - HPP
  - payload limits
  - XSS string sanitization
- Upload restrictions:
  - max file size
  - MIME allow-list
- JWT policy:
  - long random secret
  - configurable expiration
- HTTPS:
  - Vercel/Render TLS enabled
  - avoid mixed-content HTTP calls from frontend.

## 10) RPC provider setup (Infura/Alchemy)

Use Sepolia HTTPS endpoint in:

- `blockchain/.env` (`SEPOLIA_RPC_URL`)
- `backend/.env` (`SEPOLIA_RPC_URL`)
- optional frontend env `VITE_SEPOLIA_RPC_URL` for wallet add-network metadata

If switching provider, update these envs and redeploy.

## 11) Contract event listening suggestions

Recommended patterns:

1. Backend poller job (safe for Render):
   - Poll new blocks
   - Filter by contract address and event signatures
   - Upsert status in Mongo
2. Webhook indexer (best):
   - Use Alchemy/Infura webhooks
   - Verify payload signatures
   - Retry failed deliveries
3. Reconciliation task:
   - Periodically compare on-chain status with Mongo status
   - Repair drift for milestones/projects.

## 12) CI/CD

Workflows:

- `.github/workflows/frontend-ci.yml`
- `.github/workflows/backend-ci.yml`

Suggested auto-deploy:

- Vercel: auto deploy on push to `main` for frontend folder.
- Render: auto deploy enabled in service settings.
- Add branch protection requiring both CI checks before merge.

## 13) Final production readiness checklist

### Authentication

- Register/login/logout works
- JWT expiration and refresh strategy verified
- Role-based route guards work for admin/client/freelancer

### Wallet and network

- MetaMask connect/disconnect works
- Wrong-network prompts shown
- Switch/add Sepolia flow works
- Rejection errors are user-friendly

### Escrow flow

- Project create/deploy/fund works
- Freelancer assignment works
- Milestone submit/approve/release works
- Multi-milestone progression works after partial release

### Uploads

- Allowed file types upload successfully
- Disallowed files are blocked with clear error
- Oversized files are blocked
- Uploaded URL stored and rendered correctly

### Transaction handling

- Pending, confirmed, and failed transaction states shown
- Backend handles on-chain receipt mismatches
- Retry paths are clear to users

### API and DB

- Atlas connectivity stable under load
- Health endpoint returns expected status
- Rate limiter triggers under burst load
- No unhandled promise rejections in logs

### Frontend

- Build succeeds in CI
- SPA route refresh works (vercel rewrite)
- Mobile layouts are usable

## 14) Common deployment mistakes and fixes

1. Problem: 403 CORS in production
   - Cause: backend `CLIENT_URL` missing deployed frontend URL
   - Fix: add exact Vercel URL(s) to `CLIENT_URL` and redeploy backend

2. Problem: MetaMask Not active or wrong chain errors
   - Cause: user on wrong network or project not funded/assigned
   - Fix: ensure Sepolia, then fund and assign freelancer before submit

3. Problem: Uploads fail with 500
   - Cause: missing Cloudinary env vars
   - Fix: set all 3 Cloudinary credentials in Render and redeploy

4. Problem: Backend crashes on startup
   - Cause: missing required env vars or short JWT secret
   - Fix: set all required env vars; use 32+ char JWT secret

5. Problem: Contract calls fail on backend
   - Cause: invalid deployer private key or wrong contract address
   - Fix: verify `PRIVATE_KEY`, `SEPOLIA_RPC_URL`, and `CHAINESCROW_CONTRACT_ADDRESS`

6. Problem: Contract verify fails
   - Cause: wrong Etherscan key/network mismatch or old deployment artifact
   - Fix: confirm `ETHERSCAN_API_KEY`, redeploy on Sepolia, rerun verify script

7. Problem: Frontend built but API calls fail
   - Cause: bad `VITE_API_BASE_URL`
   - Fix: set full Render URL with `/api` suffix

8. Problem: CI fails on frontend build due missing env
   - Cause: required build-time vars absent in workflow
   - Fix: set placeholder env vars in workflow or repository secrets

## 15) Recommended go-live sequence

1. Deploy and verify contract on Sepolia.
2. Sync ABI and set contract address in backend/frontend env.
3. Deploy backend on Render.
4. Deploy frontend on Vercel.
5. Set domains + HTTPS.
6. Run full readiness checklist.
7. Demo with admin, client, and freelancer accounts end-to-end.
