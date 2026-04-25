# BioReactor Token (BRT)

BioReactor Token is a Monad hackathon MVP that turns small urban **Wolffia** bioreactors into an interactive onchain story.

The idea: make sustainable protein production feel tangible for an audience. Each reactor has a location, production metrics, water savings, and a funding flow connected to **Monad testnet**. Supporters can back a reactor with MON and receive **BRT** tokens as proof of participation.

## Live demo

- App: https://brt-mvp.vercel.app
- Repository: https://github.com/godin-001/bioreactor-token-mvp
- Contract (Monad testnet): `0xf0e9abe7d91f004538d5eef4d4fd65cf8973448a`
- Explorer: https://testnet.monadscan.com/address/0xf0e9abe7d91f004538d5eef4d4fd65cf8973448a

## Problem

Protein production is resource-intensive and usually invisible to the public.
This MVP explores a more engaging model:

- showcase compact, sustainable Wolffia reactors
- track impact in a simple visual interface
- let people support specific reactors onchain
- mint a tokenized record of that support

## What the MVP does

### Frontend
- Landing page focused on pitch/demo clarity
- Reactor cards with city, species, biomass, protein %, and water savings
- Wallet connection flow
- Support flow to send MON to a selected reactor
- Live stats pulled from the smart contract when available

### Smart contract
- Deploys a seeded set of demo reactors
- Accepts support for a reactor via `supportReactor`
- Mints BRT tokens to supporters
- Tracks total support and biomass metrics
- Allows owner-side harvest logging with `logHarvest`

## Tech stack

- React
- TypeScript
- Vite
- viem
- Solidity
- OpenZeppelin
- Monad Testnet
- Vercel

## How it works

1. The contract is deployed on Monad testnet.
2. The frontend reads reactor data and aggregate stats from the contract.
3. A user connects a wallet.
4. The user chooses a reactor and supports it with MON.
5. The contract records the support and mints BRT tokens.

## Local development

### Requirements
- Node.js 20+
- npm

### Install

```bash
npm install
```

### Run locally

```bash
npm run dev
```

### Build

```bash
npm run build
```

## Environment variables

Create `.env.local` based on `.env.example`:

```bash
VITE_BRT_CONTRACT_ADDRESS=0xf0e9abe7d91f004538d5eef4d4fd65cf8973448a
DEPLOYER_PRIVATE_KEY=your_private_key_here
```

## Deploy contract to Monad testnet

```bash
node scripts/deploy-monad.mjs
```

The script:
- compiles the contract
- requests faucet funds if needed
- deploys to Monad testnet
- writes the deployed contract address into `.env.local`

## Project structure

```text
contracts/              Solidity contract
scripts/                Deployment script
src/                    Frontend app
src/lib/contract.ts     Contract ABI + client config
public/                 Static assets
```

## Why this project fits Monad

This MVP uses Monad as the trust layer behind a visual, audience-friendly product:

- onchain support actions
- tokenized participation
- transparent reactor-level tracking
- simple demo flow that is easy to pitch live

## Future improvements

- Add real reactor telemetry / oracle-fed updates
- Attach proof assets to IPFS dynamically
- Add supporter leaderboard and campaign goals
- Turn BRT into access/reward mechanics
- Add admin dashboard for reactor operators

## Submission note

This repository is the hackathon MVP submission codebase for **BioReactor Token (BRT)**.
It is optimized for a strong live demo: clear visuals, simple wallet interaction, and onchain proof of support on Monad testnet.
