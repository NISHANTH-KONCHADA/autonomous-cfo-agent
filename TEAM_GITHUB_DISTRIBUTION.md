# Team GitHub Contribution & Push Guide

This guide divides the project equally between **Nishanth**, **Vivek**, and **Mounik**. 

When you share this project (as a `.zip`), each team member unzips it on their own computer. Since they are already logged into their own GitHub accounts, they can **simply tell their AI agent to commit and push their assigned files**, or run the standard Git commands below.

---

## 👥 Equal 3-Way Division

| Member | Domain | Assigned Folders & Files |
| :--- | :--- | :--- |
| **Nishanth** | **Smart Contracts & Blockchain** | `contracts/` (Solidity contracts, 15 unit tests, deployment script, Hardhat config) and `shared/` (ABI & deployment metadata) |
| **Vivek** | **AI Agent, Payment Gate & Vendors** | `backend/src/agent/`, `backend/src/paymentGate/`, `backend/src/blockchain/`, `backend/test/`, `vendors/`, and `data/` |
| **Mounik** | **Frontend Dashboard, Demo & Docs** | `frontend/`, `backend/src/server.ts`, `backend/scripts/demo.ts`, `scripts/`, `docs/`, `README.md`, and project guides |

---

## 1️⃣ NISHANTH — Smart Contracts & Base Sepolia

### 💬 What Nishanth tells his agent:
> *"Agent, I am Nishanth. Please stage my assigned smart contract files, commit them, and push them to GitHub on branch `feature/contracts-budget-policy`."*

### 📁 Nishanth's Assigned Files:
* `contracts/contracts/BudgetPolicy.sol`
* `contracts/contracts/MockUSDC.sol`
* `contracts/test/BudgetPolicy.test.ts`
* `contracts/scripts/deploy.ts`
* `contracts/hardhat.config.ts`
* `contracts/package.json`
* `contracts/tsconfig.json`
* `shared/BudgetPolicyABI.json`
* `shared/deployment.json`

### 💻 Standard Git Commands (if running manually in terminal):
```bash
git checkout -b feature/contracts-budget-policy
git add contracts/ shared/
git commit -m "feat(contracts): implement BudgetPolicy.sol, MockUSDC, Base Sepolia deployer, and 15 Hardhat tests"
git push -u origin feature/contracts-budget-policy
```

### 🗣️ What Nishanth explains in oral evaluation:
* How `BudgetPolicy.sol` enforces company budgets on Base Sepolia.
* How `canSpend()` checks department balances, per-tx limits ($50), and daily caps ($250).
* Why spends $> \$100$ require human CFO approval on-chain (`approvePayment()`).
* How all 15 smart contract tests pass.

---

## 2️⃣ VIVEK — AI Agent, Waste Rules & x402 Payment Gate

### 💬 What Vivek tells his agent:
> *"Agent, I am Vivek. Please stage my assigned AI agent, waste rules, and x402 payment gate files, commit them, and push them to GitHub on branch `feature/agent-payment-gate-x402`."*

### 📁 Vivek's Assigned Files:
* `backend/src/agent/wasteRules.ts`
* `backend/src/paymentGate/paymentGate.ts`
* `backend/src/agent/llm.ts`
* `backend/src/agent/tools.ts`
* `backend/src/agent/agentLoop.ts`
* `backend/src/blockchain/client.ts`
* `backend/test/agentAndSecurity.test.ts`
* `vendors/src/server.ts`
* `vendors/package.json`
* `vendors/tsconfig.json`
* `data/subscriptions.json`
* `data/cloud_resources.json`

### 💻 Standard Git Commands (if running manually in terminal):
```bash
git checkout -b feature/agent-payment-gate-x402
git add backend/src/agent/ backend/src/paymentGate/ backend/src/blockchain/ backend/test/ vendors/ data/
git commit -m "feat(agent): implement deterministic waste rules, x402 payment gate, Groq LLM loop, and prompt injection defense"
git push -u origin feature/agent-payment-gate-x402
```

### 🗣️ What Vivek explains in oral evaluation:
* Why waste detection is calculated using deterministic rules (60+ days inactivity, $<50\%$ seat utilization, duplicate apps) to avoid LLM hallucinations.
* How the Payment Gate maps vendor IDs to allowlists to prevent prompt injections.
* How the x402 protocol handles HTTP 402 challenge-responses with USDC.
* How all 10 backend security and rule tests pass.

---

## 3️⃣ MOUNIK — Frontend Dashboard, Demo Suite & System Docs

### 💬 What Mounik tells his agent:
> *"Agent, I am Mounik. Please stage my assigned frontend dashboard, demo script, and documentation files, commit them, and push them to GitHub on branch `feature/dashboard-and-demo-system`."*

### 📁 Mounik's Assigned Files:
* `frontend/src/App.tsx`
* `frontend/src/index.css`
* `frontend/src/main.tsx`
* `frontend/tailwind.config.js`
* `frontend/vite.config.ts`
* `frontend/index.html`
* `frontend/package.json`
* `frontend/tsconfig.json`
* `backend/src/server.ts`
* `backend/scripts/demo.ts`
* `scripts/dev.js`
* `docs/ARCHITECTURE.md`
* `docs/DEMO_SCRIPT.md`
* `docs/REPORT_NOTES.md`
* `PROJECT_EXPLAINER.md`
* `README.md`
* `package.json`
* `.env.example`
* `.gitignore`
* `buildpromt.md`

### 💻 Standard Git Commands (if running manually in terminal):
```bash
git checkout -b feature/dashboard-and-demo-system
git add frontend/ backend/src/server.ts backend/scripts/ scripts/ docs/ PROJECT_EXPLAINER.md README.md package.json .env.example .gitignore buildpromt.md
git commit -m "feat(frontend & docs): build minimalist B&W dashboard, Express API, 7-step demo runner, and architectural documentation"
git push -u origin feature/dashboard-and-demo-system
```

### 🗣️ What Mounik explains in oral evaluation:
* The minimalist black-and-white dashboard built with Inter typography for high projector readability.
* Real-time dashboard synchronization: department progress bars, 1-click waste elimination, and approval workflows.
* How the 7-step automated demo works end-to-end (`npm run demo`).
* The system architecture and project report documentation.

---

## 🔗 Connecting Your GitHub Repository (One-Time Setup)

Before pushing, ensure the local folder points to your team's GitHub repository:

```bash
git remote add origin https://github.com/YOUR_ORGANIZATION_OR_USERNAME/YOUR_REPOSITORY.git
```

Once pushed, open GitHub and merge the 3 pull requests into `main`. Your repository will show equal, well-organized contributions from **Nishanth**, **Vivek**, and **Mounik**!
