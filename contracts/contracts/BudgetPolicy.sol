// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title BudgetPolicy
 * @notice On-chain budget enforcement, policy controls, audit log, and payment gateway for Autonomous CFO Agent.
 * @dev All token amounts are denominated in USDC (6 decimals).
 */
contract BudgetPolicy is Ownable, Pausable {
    using SafeERC20 for IERC20;

    // --- State Variables ---
    IERC20 public immutable usdcToken;
    address public agent;

    struct Policy {
        uint256 perTxLimit;        // Maximum amount the agent can pay in a single transaction
        uint256 dailyCap;          // Maximum total amount the agent can spend in a single 24-hr period
        uint256 approvalThreshold; // Amounts above this threshold cannot be paid directly; must be requested
    }

    Policy public policy;

    // Daily spending tracker (day index -> total spent)
    mapping(uint256 => uint256) public dailySpend;

    // Department budget and spending tracking
    struct DepartmentBudget {
        uint256 budget;
        uint256 spent;
        bool exists;
    }
    mapping(string => DepartmentBudget) public departments;
    string[] public departmentList;

    // Vendor Allowlist
    struct VendorInfo {
        string name;
        bool isAllowed;
    }
    mapping(address => VendorInfo) public allowedVendors;

    // Payment Requests (for spends exceeding approval threshold)
    enum PaymentStatus { Pending, Approved, Rejected }

    struct PaymentRequest {
        uint256 id;
        string department;
        address vendor;
        uint256 amount;
        string reason;
        PaymentStatus status;
        uint256 createdAt;
        uint256 resolvedAt;
    }

    uint256 public nextRequestId = 1;
    mapping(uint256 => PaymentRequest) public paymentRequests;

    // --- Events (Audit Log) ---
    event SpendRecorded(
        string indexed department,
        address indexed vendor,
        uint256 amount,
        string txRef,
        uint256 timestamp
    );
    event PaymentRequested(
        uint256 indexed requestId,
        string indexed department,
        address indexed vendor,
        uint256 amount,
        string reason,
        uint256 timestamp
    );
    event PaymentApproved(
        uint256 indexed requestId,
        address indexed vendor,
        uint256 amount,
        uint256 timestamp
    );
    event PaymentRejected(
        uint256 indexed requestId,
        string reason,
        uint256 timestamp
    );
    event PolicyUpdated(
        uint256 perTxLimit,
        uint256 dailyCap,
        uint256 approvalThreshold,
        uint256 timestamp
    );
    event DepartmentBudgetSet(
        string indexed department,
        uint256 budget,
        uint256 timestamp
    );
    event VendorAllowlistUpdated(
        address indexed vendor,
        string name,
        bool isAllowed,
        uint256 timestamp
    );
    event AgentUpdated(address indexed previousAgent, address indexed newAgent);
    event AgentFloatFunded(address indexed agent, uint256 amount, uint256 timestamp);

    // --- Modifiers ---
    modifier onlyAgentOrOwner() {
        require(msg.sender == agent || msg.sender == owner(), "Not agent or owner");
        _;
    }

    constructor(
        address _usdcToken,
        address _agent,
        uint256 _perTxLimit,
        uint256 _dailyCap,
        uint256 _approvalThreshold
    ) Ownable(msg.sender) {
        require(_usdcToken != address(0), "Invalid USDC address");
        usdcToken = IERC20(_usdcToken);
        agent = _agent;

        policy = Policy({
            perTxLimit: _perTxLimit,
            dailyCap: _dailyCap,
            approvalThreshold: _approvalThreshold
        });

        emit PolicyUpdated(_perTxLimit, _dailyCap, _approvalThreshold, block.timestamp);
        if (_agent != address(0)) {
            emit AgentUpdated(address(0), _agent);
        }
    }

    // --- Configuration (Owner Only) ---

    function setAgent(address _agent) external onlyOwner {
        address prev = agent;
        agent = _agent;
        emit AgentUpdated(prev, _agent);
    }

    function setPolicy(
        uint256 _perTxLimit,
        uint256 _dailyCap,
        uint256 _approvalThreshold
    ) external onlyOwner {
        policy.perTxLimit = _perTxLimit;
        policy.dailyCap = _dailyCap;
        policy.approvalThreshold = _approvalThreshold;
        emit PolicyUpdated(_perTxLimit, _dailyCap, _approvalThreshold, block.timestamp);
    }

    function setBudget(string calldata dept, uint256 budgetAmount) external onlyOwner {
        if (!departments[dept].exists) {
            departments[dept].exists = true;
            departmentList.push(dept);
        }
        departments[dept].budget = budgetAmount;
        emit DepartmentBudgetSet(dept, budgetAmount, block.timestamp);
    }

    function allowVendor(address vendor, string calldata name) external onlyOwner {
        require(vendor != address(0), "Invalid vendor address");
        allowedVendors[vendor] = VendorInfo({ name: name, isAllowed: true });
        emit VendorAllowlistUpdated(vendor, name, true, block.timestamp);
    }

    function removeVendor(address vendor) external onlyOwner {
        allowedVendors[vendor].isAllowed = false;
        emit VendorAllowlistUpdated(vendor, allowedVendors[vendor].name, false, block.timestamp);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // --- Policy Verification (View) ---

    function getDayIndex() public view returns (uint256) {
        return block.timestamp / 1 days;
    }

    function canSpend(
        string calldata dept,
        address vendor,
        uint256 amount
    ) external view returns (bool allowed, string memory reason) {
        if (paused()) {
            return (false, "Contract paused");
        }
        if (!allowedVendors[vendor].isAllowed) {
            return (false, "Vendor not allowlisted");
        }
        if (amount > policy.perTxLimit) {
            return (false, "Exceeds per-transaction limit");
        }
        if (amount > policy.approvalThreshold) {
            return (false, "Exceeds approval threshold; requires owner approval");
        }
        if (departments[dept].exists && departments[dept].spent + amount > departments[dept].budget) {
            return (false, "Exceeds department budget");
        }
        uint256 today = getDayIndex();
        if (dailySpend[today] + amount > policy.dailyCap) {
            return (false, "Exceeds daily cap");
        }
        return (true, "Allowed");
    }

    // --- Direct Spend Recording (Agent or Owner) ---

    /**
     * @notice Records a completed spend transaction (e.g. after x402 payment).
     * @dev Enforces all policy checks and reverts if violated.
     */
    function recordSpend(
        string calldata dept,
        address vendor,
        uint256 amount,
        string calldata txRef
    ) external onlyAgentOrOwner whenNotPaused {
        require(allowedVendors[vendor].isAllowed, "Vendor not allowlisted");
        require(amount <= policy.perTxLimit, "Exceeds per-transaction limit");
        require(amount <= policy.approvalThreshold, "Exceeds approval threshold");
        require(departments[dept].exists, "Department not configured");
        require(departments[dept].spent + amount <= departments[dept].budget, "Exceeds department budget");

        uint256 today = getDayIndex();
        require(dailySpend[today] + amount <= policy.dailyCap, "Exceeds daily cap");

        departments[dept].spent += amount;
        dailySpend[today] += amount;

        emit SpendRecorded(dept, vendor, amount, txRef, block.timestamp);
    }

    // --- Approval Workflow for Large Spends ---

    /**
     * @notice Submits a payment request for amounts that require human/owner approval.
     */
    function requestPayment(
        string calldata dept,
        address vendor,
        uint256 amount,
        string calldata reason
    ) external onlyAgentOrOwner whenNotPaused returns (uint256 requestId) {
        require(allowedVendors[vendor].isAllowed, "Vendor not allowlisted");
        require(departments[dept].exists, "Department not configured");

        requestId = nextRequestId++;
        paymentRequests[requestId] = PaymentRequest({
            id: requestId,
            department: dept,
            vendor: vendor,
            amount: amount,
            reason: reason,
            status: PaymentStatus.Pending,
            createdAt: block.timestamp,
            resolvedAt: 0
        });

        emit PaymentRequested(requestId, dept, vendor, amount, reason, block.timestamp);
    }

    /**
     * @notice Owner approves a pending payment and transfers USDC directly from the contract treasury to the vendor.
     */
    function approvePayment(uint256 requestId) external onlyOwner whenNotPaused {
        PaymentRequest storage req = paymentRequests[requestId];
        require(req.id != 0, "Request does not exist");
        require(req.status == PaymentStatus.Pending, "Not in pending status");

        require(
            departments[req.department].spent + req.amount <= departments[req.department].budget,
            "Exceeds department budget"
        );

        req.status = PaymentStatus.Approved;
        req.resolvedAt = block.timestamp;
        departments[req.department].spent += req.amount;

        // Transfer funds from contract treasury to vendor
        usdcToken.safeTransfer(req.vendor, req.amount);

        emit PaymentApproved(requestId, req.vendor, req.amount, block.timestamp);
    }

    /**
     * @notice Owner rejects a pending payment request.
     */
    function rejectPayment(uint256 requestId, string calldata reason) external onlyOwner {
        PaymentRequest storage req = paymentRequests[requestId];
        require(req.id != 0, "Request does not exist");
        require(req.status == PaymentStatus.Pending, "Not in pending status");

        req.status = PaymentStatus.Rejected;
        req.resolvedAt = block.timestamp;

        emit PaymentRejected(requestId, reason, block.timestamp);
    }

    /**
     * @notice Fund the agent's wallet with a float amount from the treasury, strictly bounded by the daily cap.
     */
    function fundAgentFloat(uint256 amount) external onlyOwner {
        require(agent != address(0), "Agent not set");
        require(amount <= policy.dailyCap, "Float funding exceeds daily cap");
        usdcToken.safeTransfer(agent, amount);
        emit AgentFloatFunded(agent, amount, block.timestamp);
    }

    // --- Dashboard & Inspection Helpers ---

    function getDepartmentList() external view returns (string[] memory) {
        return departmentList;
    }

    function getDepartmentBudget(string calldata dept) external view returns (uint256 budget, uint256 spent) {
        return (departments[dept].budget, departments[dept].spent);
    }

    function getAllPaymentRequests() external view returns (PaymentRequest[] memory) {
        uint256 count = nextRequestId - 1;
        PaymentRequest[] memory list = new PaymentRequest[](count);
        for (uint256 i = 1; i <= count; i++) {
            list[i - 1] = paymentRequests[i];
        }
        return list;
    }
}
