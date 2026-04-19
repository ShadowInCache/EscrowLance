# EscrowLancer

![React](https://img.shields.io/badge/Frontend-React-61DAFB?logo=react&logoColor=white)
![Express](https://img.shields.io/badge/Backend-Express-000000?logo=express&logoColor=white)
![Hardhat](https://img.shields.io/badge/Smart_Contracts-Hardhat-f7d046?logo=hardhat&logoColor=black)
![Sepolia](https://img.shields.io/badge/Network-Sepolia-8145dc?logo=ethereum&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-2ea44f)

EscrowLancer is a hybrid on-chain/off-chain, milestone-based escrow for freelance projects. Clients fund a Sepolia smart contract, freelancers submit proofs (IPFS), and payouts release after client approval. The app ships with React + Tailwind, Express + MongoDB, and a Hardhat Solidity contract (OpenZeppelin security).

## Tech Stack
- Frontend: React (Vite), Tailwind, React Router, Axios, MetaMask/ethers provider hook
- Backend: Node.js, Express, MongoDB/Mongoose, JWT auth, Multer uploads, Pinata/IPFS helper, Ethers
- Blockchain: Solidity (Hardhat), OpenZeppelin Ownable + ReentrancyGuard, Sepolia-ready

## Project Structure
- `frontend/` – React app (dashboard, wallet connect, projects/milestones, disputes, profile, transactions)
- `backend/` – Express API (auth, projects, milestones, disputes, uploads), Mongo models, blockchain helpers
- `blockchain/` – Hardhat project with `FreelanceEscrow.sol`, deploy script, tests
- `docs/` – Architecture notes/diagram

## Quick Start
1) **Env files** – copy `.env.example` variants into place (root, backend, blockchain, frontend) and fill keys.
2) **Install deps** – `npm run install:all`
3) **Run services** (separate terminals)
   - API: `npm run dev:backend`
   - Frontend: `npm run dev:frontend`
   - Hardhat node (optional local): `npm run dev:blockchain`
4) **Compile & test contract** – `cd blockchain && npx hardhat test`
5) **Deploy to Sepolia** – set `SEPOLIA_RPC_URL`, `PRIVATE_KEY`, then `npm run deploy:sepolia --prefix blockchain`; copy the deployed address into backend `.env` (`CHAINESCROW_CONTRACT_ADDRESS`) and `frontend/.env` (`VITE_CHAINESCROW_CONTRACT_ADDRESS`).

## Environment Variables
See `.env.example` and `backend/.env.example` for the full list:
- Backend: `PORT`, `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL`, `CHAINESCROW_CONTRACT_ADDRESS`, `SEPOLIA_RPC_URL`, `PRIVATE_KEY`, `PINATA_*`, SMTP settings
- Frontend: `VITE_API_BASE_URL`, `VITE_CHAINESCROW_CONTRACT_ADDRESS`, `VITE_SEPOLIA_CHAIN_ID`
- Hardhat: `SEPOLIA_RPC_URL`, `PRIVATE_KEY`

## API Surface (summary)
- Auth: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/profile`
- Projects: create/list/detail/update status/fund/assign
- Milestones: create/submit/approve/release, list by project
- Transactions: list/save
- Disputes: create/resolve
- IPFS: upload file or JSON

## Smart Contract (FreelanceEscrow)
- Security: Ownable, ReentrancyGuard, client/freelancer role gates
- Core: create/fund/assign project; submit/approve/release milestone; disputes, refunds, cancellations; getters for projects/milestones
- Events: ProjectCreated, ProjectFunded, FreelancerAssigned, MilestoneSubmitted, MilestoneApproved, PaymentReleased, DisputeRaised, RefundIssued
- Tests: Hardhat specs for happy paths and guards (funding, submit/approve/release, unauthorized, disputes)

## Data Models (MongoDB)
- Users: name, email, hashed password, role (`client|freelancer|admin`), walletAddress
- Projects: title, description, clientId, freelancerId, budget, deadline, status, contractProjectId, milestones
- Milestones: projectId, title, description, amount, deadline, status, ipfsHash, workHash
- Transactions: projectId, milestoneId, amount, txHash, status
- Disputes: projectId, milestoneId, reason, raisedBy, status, resolution

## IPFS Flow
1) Freelancer uploads file → backend `POST /api/upload` (Multer memory) → Pinata → IPFS hash
2) Hash saved in Mongo + sent to smart contract in `submitMilestone`
3) UI renders proof link via IPFS gateway

## Frontend Pages
- Landing, Login, Signup
- Dashboard (stats + milestones), Projects list/detail, Create Project
- Milestone Submission, Transactions, Disputes, Wallet, Profile

## Architecture
Hybrid: the contract guards funds/state; backend persists metadata and orchestrates calls; frontend drives UX and MetaMask gating. See `docs/architecture.md` for a diagram.

## Sample Dummy Payloads
- Milestones for project creation:
```
[
	{ "title": "UI Design", "description": "Design all frontend pages", "amount": "0.05", "deadline": "2026-04-10" },
	{ "title": "Backend APIs", "description": "Build all backend endpoints", "amount": "0.10", "deadline": "2026-04-20" }
]
```
- Transaction document example:
```
{ "projectId": "001", "milestoneId": "1", "amount": "0.1", "txHash": "0xabc123...", "status": "Completed" }
```

## Notes
- Use MetaMask on Sepolia; chain ID `11155111`.
- Gas estimator/notifications can be added via Ethers event listeners/webhooks.
