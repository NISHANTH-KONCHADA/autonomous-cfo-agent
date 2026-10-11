# Autonomous CFO Agent

> **An AI-powered corporate financial controller combining on-chain budget governance on Base Sepolia with automated x402 vendor payments and deterministic waste remediation.**

[![Network: Base Sepolia](https://img.shields.io/badge/Network-Base%20Sepolia%20(84532)-000000?style=flat&logo=ethereum)](https://sepolia.basescan.org)
[![Solidity](https://img.shields.io/badge/Smart%20Contracts-Solidity%20v0.8.20-black?style=flat&logo=solidity)](https://soliditylang.org)
[![x402 Protocol](https://img.shields.io/badge/Payments-x402%20(HTTP%20402)-black?style=flat)](https://x402.org)
[![Groq Llama 3.3](https://img.shields.io/badge/AI%20Engine-Groq%20llama--3.3--70b-black?style=flat)](https://groq.com)
[![React Vite](https://img.shields.io/badge/Dashboard-React%2018%20%2B%20Tailwind-black?style=flat&logo=react)](https://vitejs.dev)
[![Tests Passing](https://img.shields.io/badge/Unit%20Tests-25%2F25%20Passing-black?style=flat)](contracts/test/BudgetPolicy.test.ts)

---

## 📌 Executive Overview

Enterprises waste up to 30% of their operational budgets on forgotten SaaS seat licenses, abandoned software subscriptions, and orphaned cloud compute instances.

The **Autonomous CFO Agent** solves this through dual-layer governance:
1. **Mathematical AI Waste Auditing**: Uses deterministic rules to catch inactive tools ($>60$ days), low seat utilization ($<50\%$), category duplicates, and idle servers.
2. **Immutable Blockchain Guardrails (`BudgetPolicy.sol`)**: Enforces department limits, per-transaction spending caps ($50 USDC), daily rolling caps ($250 USDC), and vendor allowlists on Base Sepolia.
3. **Frictionless Micro-Commerce (x402)**: AI agents settle external API and vendor invoices instantly using the HTTP 402 payment standard in USDC.
4. **Trustless Human-in-the-Loop Safeguard**: Spends exceeding $100 USDC are cryptographically forced into an on-chain queue requiring human CFO sign-off.

---

## 🏛️ System Architecture

```
                                  +-----------------------------+
                                  |   Minimalist Web Dashboard  |
                                  |   (React + Vite + Tailwind) |
                                  +-----------------------------+
                                                 │
                                                 ▼ (HTTP API)
+─────────────────────────────────────────────────────────────────────────────────────────+
│                                     BACKEND LAYER                                       │
│                                                                                         │
│   +─────────────────────────+   +─────────────────────────+   +───────────────────────+ │
│   │    Groq llama-3.3-70b   │──▶│   Deterministic Rules   │──▶│     Payment Gate      │ │
│   │    (Agent Task Loop)    │   │   (Inactivity & Sprawl) │   │  (canSpend & Verify)  │ │
│   +─────────────────────────+   +─────────────────────────+   +───────────────────────+ │
+───────────────────────────────────────────────────────────────────────────┬─────────────+
                                                                            │
                                     ┌──────────────────────────────────────┴─────────┐
                                     ▼                                                ▼
                     +──────────────────────────────+                 +──────────────────────────────+
                     │     x402 Mock Vendor API     │                 │   Base Sepolia (84532)       │
                     │  - MarketData ($0.05 USDC)   │                 │   - BudgetPolicy.sol         │
                     │  - Compliance ($0.10 USDC)   │                 │   - Circle USDC (0x036Cb...) │
                     +──────────────────────────────+                 +──────────────────────────────+
```

---

## 🛡️ Smart Contract Governance (`BudgetPolicy.sol`)

The `BudgetPolicy` smart contract acts as the single source of truth:
* **Department Allocations**: Tracks allocated budget, spent amounts, and remaining balances in real time.
* **Per-Transaction Cap**: Limits single autonomous payments to $50 USDC.
* **Rolling Daily Limit**: Hard stop at $250 USDC per 24 hours.
* **Approval Threshold**: Transactions exceeding $100 USDC trigger `requestPayment()` and require the Owner's private key via `approvePayment()`.
* **Vendor Allowlist**: Only pre-registered vendor addresses can receive company funds.
* **Pausability**: Owner can pause spending immediately in emergencies.
* **Immutable Audit Trail**: Emits events for every action (`SpendRecorded`, `PaymentRequested`, `PaymentApproved`, `PolicyBlocked`).

---

## ⚡ Quickstart (Under 10 Commands)

```bash
# 1. Clone repository & install dependencies
git clone https://github.com/NISHANTH-KONCHADA/autonomous-cfo-agent.git
cd autonomous-cfo-agent
npm install

# 2. Install workspace dependencies
cd contracts && npm install && cd ..
cd backend && npm install && cd ..
cd vendors && npm install && cd ..
cd frontend && npm install && cd ..

# 3. Run all unit tests (15 contract + 10 security tests)
npm test

# 4. Run the 7-step automated terminal demo
npm run demo

# 5. Launch all servers and open the dashboard
npm run dev
```

* **Frontend Dashboard**: [http://localhost:5173](http://localhost:5173)
* **Backend API**: [http://localhost:4000](http://localhost:4000)
* **x402 Vendor Server**: [http://localhost:4001](http://localhost:4001)

---

## 🧪 Test Suite

```bash
# Test 1: Smart contract governance tests (Foundry/Hardhat)
npm run test:contracts
# ✔ 15 passing: overspend blocked, allowlists enforced, daily caps reset, approvals transfer USDC

# Test 2: AI rule engine, prompt injection defense, and payment gate tests
npm run test:backend
# ✔ 10 passing: 60-day inactivity detected, prompt injection neutralized, threshold enforced

# Test 3: Run all 25 tests together
npm test
```

---

## 📁 Repository Structure

```
├── contracts/               # Hardhat project: BudgetPolicy.sol, MockUSDC.sol, tests, deployer
│   ├── contracts/           # Solidity smart contracts
│   ├── test/                # 15 Hardhat unit tests
│   └── scripts/             # Deployment script for Base Sepolia & local node
├── backend/                 # Node.js Express API & Autonomous CFO Agent
│   ├── src/agent/           # Groq LLM client, prompt sanitizer, deterministic rules
│   ├── src/paymentGate/     # x402 payment gate, allowlist resolver, on-chain verifier
│   ├── src/blockchain/      # Base Sepolia ethers client & fallback simulation
│   └── scripts/demo.ts      # 7-step presentation demo runner
├── vendors/                 # Mock vendor server with x402 HTTP 402 endpoints
├── frontend/                # Minimalist black-and-white React 18 + Vite + Tailwind dashboard
├── data/                    # Simulated company telemetry (subscriptions.json, cloud_resources.json)
├── shared/                  # Exported contract ABIs and deployment addresses
├── docs/                    # Architecture guide, 3-minute oral script, report notes
├── PROJECT_EXPLAINER.md     # Beginner-friendly guide explaining the project from scratch
└── TEAM_GITHUB_DISTRIBUTION.md # Equal team contribution guide for Nishanth, Vivek, and Mounik
```

---

## 👥 Engineering Team & Contributions

This project was built collaboratively by a team of 3 engineers:

| Contributor | Engineering Domain | Core Contributions |
| :--- | :--- | :--- |
| **Nishanth** | **Smart Contracts & Blockchain** | `BudgetPolicy.sol`, `MockUSDC.sol`, Base Sepolia deployment, 15 Hardhat unit tests, and contract ABI integration. |
| **Vivek** | **AI Agent & Payment Systems** | Deterministic waste rule engine, Groq LLM agent loop, x402 payment gate, and prompt injection defense. |
| **Mounik** | **Frontend & System Integration** | Minimalist black-and-white React dashboard, Express API, 7-step demo runner, and architectural documentation. |

---

## 📚 Documentation
* [Beginner-Friendly Project Explainer](PROJECT_EXPLAINER.md)
* [Team GitHub Distribution Guide](TEAM_GITHUB_DISTRIBUTION.md)
* [System Architecture & Threat Modeling](docs/ARCHITECTURE.md)
* [3-Minute Live Presentation Script & Examiner Q&A](docs/DEMO_SCRIPT.md)
* [Course Project Report Notes](docs/REPORT_NOTES.md)

---

## ⚖️ License
MIT License. Built for university course submission on Base Sepolia.
