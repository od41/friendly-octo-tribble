// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IYieldProtocol.sol";
import "./interfaces/IActivityValidator.sol";

contract FitFi is ReentrancyGuard, Ownable {
    struct Pool {
        uint256 startTime;
        uint256 endTime;
        uint256 totalDeposits;
        uint256 totalInterest;
        bool isActive;
        address owner;
        mapping(address => uint256) deposits;
        mapping(address => uint256) activityPoints;
        mapping(address => bool) hasWithdrawn;
    }

    IERC20 public immutable depositToken;
    IYieldProtocol public immutable yieldProtocol;
    IActivityValidator public activityValidator;

    uint256 public constant ADMIN_FEE_BPS = 500; // 5%
    uint256 public poolCounter;

    mapping(uint256 => Pool) public pools;
    mapping(uint256 => mapping(address => uint256)) public userMultipliers;
    mapping(uint256 => uint256) public totalActivityPoints;

    event PoolCreated(uint256 indexed poolId, uint256 startTime, uint256 endTime);
    event Deposited(uint256 indexed poolId, address indexed user, uint256 amount);
    event ActivitySubmitted(uint256 indexed poolId, address indexed user, uint256 points);
    event RewardsClaimed(uint256 indexed poolId, address indexed user, uint256 amount);
    event MultiplierApplied(uint256 indexed poolId, address[] users, uint256 multiplier);
    event Withdrawn(uint256 indexed poolId, address indexed user, uint256 principal, uint256 rewards);

    constructor(address _depositToken, address _yieldProtocol, address _activityValidator) {
        depositToken = IERC20(_depositToken);
        yieldProtocol = IYieldProtocol(_yieldProtocol);
        activityValidator = IActivityValidator(_activityValidator);
    }

    function createPool(uint256 startTime, uint256 duration) external {
        require(startTime > block.timestamp, "Invalid start time");

        uint256 poolId = poolCounter++;
        Pool storage pool = pools[poolId];

        pool.startTime = startTime;
        pool.endTime = startTime + duration;
        pool.isActive = true;
        pool.owner = msg.sender;

        emit PoolCreated(poolId, startTime, startTime + duration);
    }

    function deposit(uint256 poolId, uint256 amount) external nonReentrant {
        Pool storage pool = pools[poolId];
        require(pool.isActive, "Pool not active");
        require(block.timestamp < pool.endTime, "Pool ended");

        depositToken.transferFrom(msg.sender, address(this), amount);
        depositToken.approve(address(yieldProtocol), amount);
        yieldProtocol.deposit(address(depositToken), amount);

        pool.deposits[msg.sender] += amount;
        pool.totalDeposits += amount;

        emit Deposited(poolId, msg.sender, amount);
    }

    function submitActivity(
        uint256 poolId,
        IActivityValidator.ActivityProof calldata proof,
        address[] calldata nearbyUsers,
        bytes32[] calldata proximityProofs
    ) external nonReentrant {
        Pool storage pool = pools[poolId];
        require(pool.isActive, "Pool not active");
        require(block.timestamp >= pool.startTime, "Pool not started");
        require(block.timestamp <= pool.endTime, "Pool ended");
        require(pool.deposits[msg.sender] > 0, "No deposits");

        // Validate activity
        require(activityValidator.validateActivity(poolId, msg.sender, proof), "Invalid activity");

        // Calculate base points (1 point per valid activity)
        uint256 basePoints = 1e18;

        // Apply proximity multiplier if there are nearby users
        if (nearbyUsers.length > 0) {
            uint256 multiplier = activityValidator.validateProximity(poolId, nearbyUsers, proximityProofs);
            require(multiplier > 0, "Invalid proximity proof");

            basePoints = basePoints * multiplier / 1e18;
            userMultipliers[poolId][msg.sender] = multiplier;

            emit MultiplierApplied(poolId, nearbyUsers, multiplier);
        }

        pool.activityPoints[msg.sender] += basePoints;
        totalActivityPoints[poolId] += basePoints;

        emit ActivitySubmitted(poolId, msg.sender, basePoints);
    }

    function calculateRewards(uint256 poolId, address user) public view returns (uint256) {
        Pool storage pool = pools[poolId];
        if (totalActivityPoints[poolId] == 0) return 0;

        uint256 totalInterest = yieldProtocol.getAccruedInterest(address(depositToken));
        uint256 userShare = (pool.activityPoints[user] * 1e18) / totalActivityPoints[poolId];

        // Calculate rewards after admin fee
        uint256 availableInterest = (totalInterest * (10000 - ADMIN_FEE_BPS)) / 10000;
        return (availableInterest * userShare) / 1e18;
    }

    function withdraw(uint256 poolId) external nonReentrant {
        Pool storage pool = pools[poolId];
        require(block.timestamp > pool.endTime, "Pool still active");
        require(!pool.hasWithdrawn[msg.sender], "Already withdrawn");
        require(pool.deposits[msg.sender] > 0, "No deposits");

        uint256 principal = pool.deposits[msg.sender];
        uint256 rewards = calculateRewards(poolId, msg.sender);

        pool.hasWithdrawn[msg.sender] = true;

        // Withdraw from yield protocol
        yieldProtocol.withdraw(address(depositToken), principal);

        // Transfer principal and rewards
        require(depositToken.transfer(msg.sender, principal), "Principal transfer failed");
        if (rewards > 0) {
            require(depositToken.transfer(msg.sender, rewards), "Rewards transfer failed");
        }

        emit Withdrawn(poolId, msg.sender, principal, rewards);
    }

    function closePool(uint256 poolId) external {
        Pool storage pool = pools[poolId];
        require(msg.sender == pool.owner, "Only the pool owner can close it");
        require(block.timestamp > pool.endTime, "Pool still active");
        require(pool.isActive, "Pool already closed");

        pool.isActive = false;

        // Calculate and transfer admin fees
        uint256 totalInterest = yieldProtocol.getAccruedInterest(address(depositToken));
        uint256 adminFee = (totalInterest * ADMIN_FEE_BPS) / 10000;

        if (adminFee > 0) {
            yieldProtocol.withdraw(address(depositToken), adminFee);
            require(depositToken.transfer(owner(), adminFee), "Admin fee transfer failed");
        }
    }

    // View functions
    function getUserDeposit(uint256 poolId, address user) external view returns (uint256) {
        return pools[poolId].deposits[user];
    }

    function getUserActivityPoints(uint256 poolId, address user) external view returns (uint256) {
        return pools[poolId].activityPoints[user];
    }

    function getPoolTotalDeposits(uint256 poolId) external view returns (uint256) {
        return pools[poolId].totalDeposits;
    }

    function getPoolTotalActivityPoints(uint256 poolId) external view returns (uint256) {
        return totalActivityPoints[poolId];
    }
}
