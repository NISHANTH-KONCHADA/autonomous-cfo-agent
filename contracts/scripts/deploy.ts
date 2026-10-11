import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log(`Starting deployment on network: ${network.name}`);
  const [deployer] = await ethers.getSigners();
  console.log(`Deployer address: ${deployer.address}`);

  let usdcAddress = process.env.USDC_ADDRESS;
  const isBaseSepolia = network.name === "baseSepolia" || network.config.chainId === 84532;

  if (isBaseSepolia) {
    // Official Base Sepolia USDC
    usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
    console.log(`Using official Base Sepolia USDC: ${usdcAddress}`);
  } else if (!usdcAddress || usdcAddress === "" || usdcAddress === "0x036CbD53842c5426634e7929541eC2318f3dCF7e") {
    console.log("Local/Test network detected. Deploying MockUSDC...");
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const mockUsdc = await MockUSDC.deploy();
    await mockUsdc.waitForDeployment();
    usdcAddress = await mockUsdc.getAddress();
    console.log(`MockUSDC deployed at: ${usdcAddress}`);
  }

  // Agent address (default to account #1 or deployer)
  const signers = await ethers.getSigners();
  const agentAddress = signers.length > 1 ? signers[1].address : deployer.address;
  console.log(`Configuring agent address: ${agentAddress}`);

  // Policy Limits in USDC (6 decimals)
  const PER_TX_LIMIT = ethers.parseUnits("50", 6);          // $50 per tx
  const DAILY_CAP = ethers.parseUnits("250", 6);            // $250 per day
  const APPROVAL_THRESHOLD = ethers.parseUnits("100", 6);   // $100 requires approval

  console.log("Deploying BudgetPolicy...");
  const BudgetPolicy = await ethers.getContractFactory("BudgetPolicy");
  const policy = await BudgetPolicy.deploy(
    usdcAddress,
    agentAddress,
    PER_TX_LIMIT,
    DAILY_CAP,
    APPROVAL_THRESHOLD
  );
  await policy.waitForDeployment();
  const policyAddress = await policy.getAddress();
  console.log(`BudgetPolicy deployed at: ${policyAddress}`);

  // Initialize Department Budgets
  console.log("Setting up department budgets...");
  const departments = [
    { name: "Engineering", budget: ethers.parseUnits("15000", 6) },
    { name: "Sales", budget: ethers.parseUnits("10000", 6) },
    { name: "Marketing", budget: ethers.parseUnits("8000", 6) },
    { name: "Product", budget: ethers.parseUnits("7000", 6) },
    { name: "Operations", budget: ethers.parseUnits("6000", 6) },
    { name: "Finance", budget: ethers.parseUnits("5000", 6) },
  ];

  for (const dept of departments) {
    const tx = await policy.setBudget(dept.name, dept.budget);
    await tx.wait();
    console.log(`  Set budget for ${dept.name}: $${ethers.formatUnits(dept.budget, 6)} USDC`);
  }

  // Allowlist initial mock vendors
  console.log("Setting up initial allowed vendors...");
  const mockVendors = [
    { address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", name: "MarketData Oracle API" },
    { address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", name: "CloudCost Auditing Svc" },
    { address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906", name: "ComplianceGuard Microservice" },
  ];

  for (const vendor of mockVendors) {
    const tx = await policy.allowVendor(vendor.address, vendor.name);
    await tx.wait();
    console.log(`  Allowlisted vendor: ${vendor.name} (${vendor.address})`);
  }

  // Export deployment info for backend and frontend
  const deploymentInfo = {
    network: network.name,
    chainId: network.config.chainId || 31337,
    budgetPolicyAddress: policyAddress,
    usdcAddress: usdcAddress,
    agentAddress: agentAddress,
    ownerAddress: deployer.address,
    perTxLimit: PER_TX_LIMIT.toString(),
    dailyCap: DAILY_CAP.toString(),
    approvalThreshold: APPROVAL_THRESHOLD.toString(),
    deployedAt: new Date().toISOString(),
  };

  const outputDir = path.resolve(__dirname, "../../shared");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(outputDir, "deployment.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );

  // Also export ABI
  const artifact = await ethers.getContractFactory("BudgetPolicy");
  fs.writeFileSync(
    path.join(outputDir, "BudgetPolicyABI.json"),
    JSON.stringify(artifact.interface.formatJson(), null, 2)
  );

  console.log(`Deployment metadata written to ${path.join(outputDir, "deployment.json")}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
