import { expect } from "chai";
import { ethers } from "hardhat";
import { BudgetPolicy, MockUSDC } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("BudgetPolicy Governance & Security Tests", function () {
  let usdc: MockUSDC;
  let policy: BudgetPolicy;
  let owner: HardhatEthersSigner;
  let agent: HardhatEthersSigner;
  let vendor1: HardhatEthersSigner;
  let vendor2: HardhatEthersSigner;
  let unauthorized: HardhatEthersSigner;

  // Constants (6 decimals)
  const PER_TX_LIMIT = ethers.parseUnits("50", 6); // $50 USDC
  const DAILY_CAP = ethers.parseUnits("200", 6); // $200 USDC
  const APPROVAL_THRESHOLD = ethers.parseUnits("100", 6); // $100 USDC
  const ENG_BUDGET = ethers.parseUnits("500", 6); // $500 USDC

  beforeEach(async function () {
    [owner, agent, vendor1, vendor2, unauthorized] = await ethers.getSigners();

    // 1. Deploy Mock USDC
    const MockUSDCFactory = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDCFactory.deploy();
    await usdc.waitForDeployment();

    // 2. Deploy BudgetPolicy
    const BudgetPolicyFactory = await ethers.getContractFactory("BudgetPolicy");
    policy = await BudgetPolicyFactory.deploy(
      await usdc.getAddress(),
      agent.address,
      PER_TX_LIMIT,
      DAILY_CAP,
      APPROVAL_THRESHOLD
    );
    await policy.waitForDeployment();

    // 3. Setup Department Budget & Vendor Allowlist
    await policy.setBudget("Engineering", ENG_BUDGET);
    await policy.allowVendor(vendor1.address, "CloudMetrics API");

    // 4. Fund Policy contract with USDC (treasury)
    await usdc.mint(await policy.getAddress(), ethers.parseUnits("10000", 6));
  });

  describe("Deployment & Initial Configuration", function () {
    it("should set correct policy parameters and agent", async function () {
      const pol = await policy.policy();
      expect(pol.perTxLimit).to.equal(PER_TX_LIMIT);
      expect(pol.dailyCap).to.equal(DAILY_CAP);
      expect(pol.approvalThreshold).to.equal(APPROVAL_THRESHOLD);
      expect(await policy.agent()).to.equal(agent.address);
    });

    it("should report allowed spend for compliant transaction", async function () {
      const [allowed, reason] = await policy.canSpend(
        "Engineering",
        vendor1.address,
        ethers.parseUnits("10", 6)
      );
      expect(allowed).to.be.true;
      expect(reason).to.equal("Allowed");
    });
  });

  describe("1. Overspend Blocked (Department Budget Limit)", function () {
    it("should block and revert when spend exceeds department budget", async function () {
      const budgetExceedingAmount = ENG_BUDGET + ethers.parseUnits("1", 6);
      
      const [allowed, reason] = await policy.canSpend(
        "Engineering",
        vendor1.address,
        budgetExceedingAmount
      );
      expect(allowed).to.be.false;
      // Also exceeds per-tx limit
      expect(reason).to.include("limit");

      // Set department budget very low to specifically trigger budget exceeded check
      await policy.setBudget("Engineering", ethers.parseUnits("5", 6));
      const [budgetAllowed, budgetReason] = await policy.canSpend(
        "Engineering",
        vendor1.address,
        ethers.parseUnits("6", 6)
      );
      expect(budgetAllowed).to.be.false;
      expect(budgetReason).to.equal("Exceeds department budget");

      await expect(
        policy.connect(agent).recordSpend("Engineering", vendor1.address, ethers.parseUnits("6", 6), "tx-001")
      ).to.be.revertedWith("Exceeds department budget");
    });
  });

  describe("2. Non-Allowlisted Vendor Blocked", function () {
    it("should prevent spending to a vendor not on allowlist", async function () {
      const [allowed, reason] = await policy.canSpend(
        "Engineering",
        vendor2.address,
        ethers.parseUnits("10", 6)
      );
      expect(allowed).to.be.false;
      expect(reason).to.equal("Vendor not allowlisted");

      await expect(
        policy.connect(agent).recordSpend("Engineering", vendor2.address, ethers.parseUnits("10", 6), "tx-unauth")
      ).to.be.revertedWith("Vendor not allowlisted");
    });

    it("should succeed after owner allowlists vendor", async function () {
      await policy.allowVendor(vendor2.address, "SecurityAudit Corp");
      const [allowed] = await policy.canSpend(
        "Engineering",
        vendor2.address,
        ethers.parseUnits("10", 6)
      );
      expect(allowed).to.be.true;
    });
  });

  describe("3. Above-Threshold Payment Forced into Pending", function () {
    it("should block direct spend above approval threshold", async function () {
      // 120 USDC is above threshold of 100 USDC and perTxLimit of 50 USDC
      const largeAmount = ethers.parseUnits("120", 6);
      const [allowed, reason] = await policy.canSpend("Engineering", vendor1.address, largeAmount);
      expect(allowed).to.be.false;

      await expect(
        policy.connect(agent).recordSpend("Engineering", vendor1.address, largeAmount, "tx-large")
      ).to.be.reverted;
    });

    it("should create pending request via requestPayment", async function () {
      const largeAmount = ethers.parseUnits("250", 6);
      const tx = await policy
        .connect(agent)
        .requestPayment("Engineering", vendor1.address, largeAmount, "Annual server license renewal");

      await expect(tx)
        .to.emit(policy, "PaymentRequested");

      const requests = await policy.getAllPaymentRequests();
      expect(requests.length).to.equal(1);
      expect(requests[0].id).to.equal(1);
      expect(requests[0].amount).to.equal(largeAmount);
      expect(requests[0].status).to.equal(0); // Pending
    });
  });

  describe("4. Owner Approval Executes & Transfers USDC", function () {
    it("should transfer USDC to vendor and mark approved upon owner approval", async function () {
      const largeAmount = ethers.parseUnits("300", 6);
      await policy
        .connect(agent)
        .requestPayment("Engineering", vendor1.address, largeAmount, "Bulk API credits");

      const vendorInitialBal = await usdc.balanceOf(vendor1.address);

      await expect(policy.connect(owner).approvePayment(1))
        .to.emit(policy, "PaymentApproved");

      const vendorFinalBal = await usdc.balanceOf(vendor1.address);
      expect(vendorFinalBal - vendorInitialBal).to.equal(largeAmount);

      const requests = await policy.getAllPaymentRequests();
      expect(requests[0].status).to.equal(1); // Approved

      const [, spent] = await policy.getDepartmentBudget("Engineering");
      expect(spent).to.equal(largeAmount);
    });
  });

  describe("5. Non-Owner Cannot Approve", function () {
    it("should revert if agent or unauthorized user tries to approve", async function () {
      await policy
        .connect(agent)
        .requestPayment("Engineering", vendor1.address, ethers.parseUnits("150", 6), "Consulting fee");

      await expect(policy.connect(agent).approvePayment(1)).to.be.revertedWithCustomError(
        policy,
        "OwnableUnauthorizedAccount"
      );

      await expect(policy.connect(unauthorized).approvePayment(1)).to.be.revertedWithCustomError(
        policy,
        "OwnableUnauthorizedAccount"
      );
    });
  });

  describe("6. Daily Cap Enforcement and Next-Day Reset", function () {
    it("should enforce daily cap across multiple transactions within 24 hours", async function () {
      // Per tx limit is 50, daily cap is 200
      const payment = ethers.parseUnits("40", 6);

      // 4 payments = 160 USDC
      for (let i = 0; i < 4; i++) {
        await policy.connect(agent).recordSpend("Engineering", vendor1.address, payment, `ref-${i}`);
      }

      // 5th payment of 40 = 200 USDC total (allowed, reaches cap)
      await policy.connect(agent).recordSpend("Engineering", vendor1.address, payment, "ref-4");

      // 6th payment would exceed daily cap of 200
      const [allowed, reason] = await policy.canSpend("Engineering", vendor1.address, ethers.parseUnits("10", 6));
      expect(allowed).to.be.false;
      expect(reason).to.equal("Exceeds daily cap");

      await expect(
        policy.connect(agent).recordSpend("Engineering", vendor1.address, ethers.parseUnits("10", 6), "ref-overflow")
      ).to.be.revertedWith("Exceeds daily cap");
    });

    it("should reset daily cap on next day (timestamp + 1 day)", async function () {
      // Spend up to daily cap
      await policy.connect(agent).recordSpend("Engineering", vendor1.address, ethers.parseUnits("50", 6), "ref-1");
      await policy.connect(agent).recordSpend("Engineering", vendor1.address, ethers.parseUnits("50", 6), "ref-2");
      await policy.connect(agent).recordSpend("Engineering", vendor1.address, ethers.parseUnits("50", 6), "ref-3");
      await policy.connect(agent).recordSpend("Engineering", vendor1.address, ethers.parseUnits("50", 6), "ref-4");

      // Fast-forward time by 1 day (86400 seconds)
      await ethers.provider.send("evm_increaseTime", [86400]);
      await ethers.provider.send("evm_mine", []);

      // Spend is now allowed again
      const [allowed, reason] = await policy.canSpend("Engineering", vendor1.address, ethers.parseUnits("30", 6));
      expect(allowed).to.be.true;
      expect(reason).to.equal("Allowed");

      await expect(
        policy.connect(agent).recordSpend("Engineering", vendor1.address, ethers.parseUnits("30", 6), "ref-next-day")
      ).to.not.be.reverted;
    });
  });

  describe("7. Pause Works", function () {
    it("should block spends and requests when paused, and resume when unpaused", async function () {
      await policy.pause();

      const [allowed, reason] = await policy.canSpend("Engineering", vendor1.address, ethers.parseUnits("10", 6));
      expect(allowed).to.be.false;
      expect(reason).to.equal("Contract paused");

      await expect(
        policy.connect(agent).recordSpend("Engineering", vendor1.address, ethers.parseUnits("10", 6), "ref-paused")
      ).to.be.revertedWithCustomError(policy, "EnforcedPause");

      await expect(
        policy.connect(agent).requestPayment("Engineering", vendor1.address, ethers.parseUnits("50", 6), "paused req")
      ).to.be.revertedWithCustomError(policy, "EnforcedPause");

      // Unpause and verify operation returns to normal
      await policy.unpause();
      const [unpausedAllowed] = await policy.canSpend("Engineering", vendor1.address, ethers.parseUnits("10", 6));
      expect(unpausedAllowed).to.be.true;
    });
  });

  describe("8. Agent Float Funding and Rejection Workflow", function () {
    it("should allow owner to fund agent float up to daily cap", async function () {
      const floatAmount = ethers.parseUnits("150", 6);
      const agentInitialBal = await usdc.balanceOf(agent.address);

      await expect(policy.connect(owner).fundAgentFloat(floatAmount))
        .to.emit(policy, "AgentFloatFunded");

      const agentFinalBal = await usdc.balanceOf(agent.address);
      expect(agentFinalBal - agentInitialBal).to.equal(floatAmount);
    });

    it("should prevent funding float beyond daily cap", async function () {
      const excessiveFloat = DAILY_CAP + ethers.parseUnits("10", 6);
      await expect(policy.connect(owner).fundAgentFloat(excessiveFloat)).to.be.revertedWith(
        "Float funding exceeds daily cap"
      );
    });

    it("should allow owner to reject a payment request with a reason", async function () {
      await policy
        .connect(agent)
        .requestPayment("Engineering", vendor1.address, ethers.parseUnits("200", 6), "Unneeded server upgrade");

      await expect(policy.connect(owner).rejectPayment(1, "Department over discretionary limit"))
        .to.emit(policy, "PaymentRejected");

      const requests = await policy.getAllPaymentRequests();
      expect(requests[0].status).to.equal(2); // Rejected
    });
  });
});
