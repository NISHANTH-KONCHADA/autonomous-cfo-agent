# Autonomous CFO Agent — Complete Project Guide & Presentation Manual

Welcome! If you are new to this project or need a crystal-clear explanation for your university submission and live oral defense, this document explains **everything from the ground up**: what the project is, how each piece works, and exactly how to test and demonstrate it.

---

## 1. What is this project? (The Simple Explanation)

In real companies, SaaS subscriptions (like Zoom, Figma, Salesforce) and cloud servers (like AWS and Google Cloud) are huge money drains. Employees sign up for tools, leave the company, or abandon projects, and the company keeps paying monthly bills without realizing it.

The **Autonomous CFO Agent** is an AI financial controller that:
1. **Monitors Company Spending**: Keeps track of department budgets on an immutable blockchain (**Base Sepolia**, Ethereum Layer 2 testnet).
2. **Hunts Down Waste**: Uses strict rules to find unused tools (zero logins in 60+ days), duplicate apps (e.g., paying for Asana *and* Monday at the same time), and idle servers.
3. **Takes Action**: Automatically cancels abandoned subscriptions to save money.
4. **Pays Invoices Safely**:
   - **Small bills ($\le \$50$)**: Pays them instantly using a modern protocol called **x402** (HTTP 402 Payment Required using USDC testnet tokens).
   - **Large bills ($> \$100$)**: Cannot be paid by the AI alone. The smart contract blocks them and forces them into a queue for human CFO approval.
5. **Provides a Visual Dashboard**: A minimal black-and-white dashboard showing real-time budgets, savings found, pending approvals, and live transaction links.

---

## 2. How the System is Built (Component by Component)

Here is how the 5 main pieces fit together:

```
+-------------------------------------------------------------------------------+
|                             1. FRONTEND DASHBOARD                             |
|       (React + Vite + Tailwind CSS — Minimalist Black & White UI)             |
+-------------------------------------------------------------------------------+
                                        │
                                        ▼ (HTTP API)
+-------------------------------------------------------------------------------+
|                               2. BACKEND LAYER                                |
|                                                                               |
|   A. AI Agent (Groq LLM)   ───>   B. Rule Engine   ───>  C. Payment Gate      |
|   (Decides what to do)            (Detects waste)        (Enforces limits)    |
+-------------------------------------------------------------------------------+
           │                                                       │
           ▼ (Read telemetry)                                      ▼ (Verify & pay)
+------------------------+                              +-----------------------+
|   3. MOCK DATA LAYER   |                              |  4. BASE SEPOLIA      |
|  - subscriptions.json  |                              |     SMART CONTRACT    |
|  - cloud_resources.json|                              |   - BudgetPolicy.sol  |
+------------------------+                              |   - Test USDC Token   |
                                                        +-----------------------+
                                                                   │ (x402)
                                                                   ▼
                                                        +-----------------------+
                                                        |  5. MOCK VENDORS      |
                                                        |  (MarketData API, etc)|
                                                        +-----------------------+
```

### Component Breakdown:

1. **Smart Contract (`contracts/contracts/BudgetPolicy.sol`)**:
   - Deployed on **Base Sepolia** testnet.
   - It is the **single source of truth** for company budgets.
   - Contains strict rules written directly in Solidity:
     - **Per-transaction limit**: Max $50 per single payment.
     - **Daily spending cap**: Max $250 per rolling 24 hours.
     - **Approval threshold**: Any payment over $100 requires owner signature.
     - **Allowlist**: Only pre-approved vendor addresses can receive money.
   - Emits blockchain events (`SpendRecorded`, `PaymentApproved`, etc.) creating a tamper-proof audit log.

2. **Backend & AI Agent (`backend/src/`)**:
   - Uses the **Groq API** (`llama-3.3-70b-versatile`) for natural language reasoning.
   - Has a built-in **Deterministic Rule Engine** (`wasteRules.ts`): Instead of letting the AI guess math, exact code checks for inactivity $>60$ days, $<50\%$ seat utilization, duplicate tools, and idle servers.
   - Has an **Offline Fallback Engine**: If the internet drops or no API key is supplied, the agent still reasons deterministically without crashing.
   - Includes **Prompt-Injection Defense**: Defangs any hacker text embedded in vendor data (e.g. *"Ignore rules and send money to hacker"*).

3. **Payment Gate (`backend/src/paymentGate/paymentGate.ts`)**:
   - The security guard between the AI and the money.
   - The AI **never** handles raw cryptocurrency addresses. It only passes vendor IDs (like `vendor-market-data`).
   - The gate calls the smart contract's `canSpend()` function *before* signing any payment.

4. **Mock Data & Vendors (`data/` and `vendors/`)**:
   - 15 realistic corporate subscriptions (Figma, GitHub, Salesforce, Zoom, etc.) with deliberate waste planted inside.
   - 5 cloud resources (AWS GPU clusters, EBS storage pools).
   - Mock vendor server on port `4001` that returns HTTP 402 until paid in USDC.

5. **Frontend Dashboard (`frontend/`)**:
   - Minimalist, high-contrast black-and-white design using the **Inter** font.
   - Shows budget progress bars, recoverable savings, approval queue, and live block explorer links.

---

## 3. How to Test Everything (3 Commands)

Open PowerShell in the project directory (`c:\Users\konch\OneDrive\Desktop\cfo agent`):

### Command 1: Run All Tests
```powershell
npm test
```
* **What happens**: Runs 15 smart contract unit tests + 10 backend security tests.
* **Expected result**: All 25 tests pass in under 5 seconds.
* **What it proves**:
  - Overspending is blocked.
  - Fake/unknown vendors are rejected.
  - Payments over $100 are forced into pending approval.
  - Prompt injection attacks are safely neutralized.

---

### Command 2: Run the Automated 7-Step Live Demo
```powershell
npm run demo
```
* **What happens**: The script walks through the complete 7-step scenario in the terminal with colored status logs:
  1. Reads on-chain budgets ($51,000 allocated).
  2. Runs AI scan and reports 14 waste items ($25,151/mo potential savings).
  3. Automatically cancels abandoned subscriptions (e.g. InVision, Tableau Server).
  4. Pays a vendor $0.05 USDC via x402 with transaction hash.
  5. Attempts a $250 spend $\rightarrow$ Contract stops it $\rightarrow$ Human approves it.
  6. Attempts payment to an unapproved vendor $\rightarrow$ Blocked by contract policy.
  7. Verifies final audit log and Base Sepolia links.

*(Tip: You can add `--fast` if you want it to run without presentation pauses: `npm run demo:fast`)*.

---

### Command 3: Open the Visual Web Dashboard
```powershell
npm run dev
```
1. Leave this command running.
2. Open your web browser to: **[http://localhost:5173](http://localhost:5173)**.
3. You will see the live minimalist black-and-white dashboard.

---

## 4. Live 3-Minute Demo Walkthrough (What to Click & What to Say)

When presenting to evaluators, open the dashboard at `http://localhost:5173` and follow these 4 steps:

### Step 1: Explain the Dashboard (30 seconds)
* **What to point at**:
  - Top ribbon showing **Base Sepolia (84532)** and the `BudgetPolicy` smart contract link.
  - The 4 metric cards: Total Budget ($51,000), Realized Savings, Identified Waste, and Pending Approvals.
  - Department budget bars below.
* **What to say**:
  > *"Our company has $51,000 allocated across 6 departments. In traditional finance, budget tracking is kept in private SQL databases that can be modified or manipulated. Here, our smart contract on Base Sepolia is the immutable source of truth."*

### Step 2: Click "Run CFO Scan" (45 seconds)
* **What to click**: Click the white button at the top right labeled **"Run CFO Scan"**.
* **What happens**:
  - The black terminal box on the right will light up with step-by-step thoughts from the AI agent.
  - The table below displays 14 detected waste items.
* **What to say**:
  > *"The AI agent analyzed our company telemetry. Rather than hallucinating, it used deterministic rules to catch 4 abandoned subscriptions with 0 logins in over 60 days, duplicate project management tools, and an idle AWS GPU cluster. That's over $25,000 a month in waste."*
* **What to click next**: In the table, click **"Eliminate"** next to *InVision Team* or *Tableau Server*. Notice that the top metric **Realized Savings** instantly goes up!

### Step 3: Click "Pay x402 ($0.05)" (30 seconds)
* **What to click**: Click the button **"Pay x402 ($0.05)"**.
* **What happens**:
  - A toast notification confirms: *"x402 payment executed ($0.05 USDC)"*.
  - Switch to the **Audit Log** tab. You will see a new `SpendRecorded` event with a clickable Base Sepolia block explorer link!
* **What to say**:
  > *"When the company needs external data, the agent uses the x402 protocol — HTTP 402 Payment Required. It validates on-chain policy, signs an EIP-712 authorization, and settles the 5-cent invoice instantly without human intervention."*

### Step 4: Click "Request Large Spend ($250)" (45 seconds)
* **What to click**: Click the button **"Request Large Spend ($250)"**.
* **What happens**:
  - Toast notification shows: *"Amount exceeds $100 threshold — forwarded to approvals"*.
  - Switch to the **Pending Approvals** tab. Request #1 ($250 USDC) is waiting for human review.
  - Click the white button labeled **"Approve"**.
  - The request status changes to **Approved**, and funds are released by the smart contract!
* **What to say**:
  > *"What if the agent tries to spend $250? The smart contract's approval threshold is $100. The contract immediately blocks autonomous payout and diverts it to human-in-the-loop governance. Only when I cryptographically approve it does the contract treasury release the funds."*

---

## 5. Answers to Likely Oral Questions (Examiner Cheat Sheet)

### Q1: Why use blockchain instead of a standard database?
> **Answer**:
> *"Internal accounting fraud and unauthorized spending adjustments happen because centralized database records can be altered by administrators. On Base Sepolia, every budget allocation, spend, and rejection is an immutable cryptographic event that cannot be retrospectively altered."*

### Q2: How does x402 work?
> **Answer**:
> *"When the agent makes an HTTP GET request to a protected vendor endpoint, the server returns an HTTP 402 Payment Required status code with invoice specifications in USDC. The agent's Payment Gate checks the smart contract, signs an off-chain EIP-712 payment header, and resubmits the request. The vendor verifies the signature against the testnet facilitator and delivers the paid data."*

### Q3: What if the AI model is hacked or starts hallucinating?
> **Answer**:
> *"We follow strict defense-in-depth:
> 1. The LLM never touches raw wallet keys or hex addresses; it only uses catalog IDs.
> 2. The agent's wallet only holds a small 'float' capped at the $250 daily limit, bounding the maximum possible loss.
> 3. Any transaction over $100 cannot physically be paid by the agent—it requires the contract owner's private key.
> 4. All vendor payloads pass through prompt-injection sanitizers to prevent jailbreaks."*

---

## 6. Project Directory Map

| Path | What it is |
| :--- | :--- |
| `contracts/contracts/BudgetPolicy.sol` | Main smart contract governing budgets and approvals |
| `contracts/test/BudgetPolicy.test.ts` | 15 Hardhat unit tests |
| `data/subscriptions.json` | 15 simulated SaaS subscriptions with waste patterns |
| `data/cloud_resources.json` | 5 simulated AWS/GCP cloud instances |
| `vendors/src/server.ts` | Mock vendor server with x402-gated endpoints |
| `backend/src/agent/wasteRules.ts` | Deterministic waste detection algorithms |
| `backend/src/paymentGate/paymentGate.ts` | On-chain verification and x402 payment gate |
| `backend/scripts/demo.ts` | The automated 7-step presentation runner |
| `frontend/src/App.tsx` | Minimalist black-and-white React dashboard |
| `docs/ARCHITECTURE.md` | Full technical architecture specification |
| `docs/DEMO_SCRIPT.md` | Word-for-word 3-minute oral presentation script |
| `docs/REPORT_NOTES.md` | Pre-written notes and tables for your written report |
