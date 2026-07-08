//SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./RewardToken.sol";

contract YieldFarm{
    IERC20 public lpToken;
    RewardToken public rewardToken;

    struct Pool{
        uint256 totalStaked;
        uint256 rewardPerBlock;
        uint256 lastRewardBlock;
        uint256 accRewardPerShare;
    }
    struct User{    
        uint256 amount;
        uint256 rewardDebt;
    }

    Pool public pool;
    mapping(address => User) public users;

    error AmountMustBeGreaterThanZero();
    error NothingStaked();
    error NothingToHarvest();
    error InsufficientStakedBalance();

    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event Harvested(address indexed user, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 amount);

    constructor(address _lpToken, address _rewardToken, uint256 _rewardPerBlock){
        lpToken = IERC20(_lpToken);
        rewardToken = RewardToken(_rewardToken);
        pool.rewardPerBlock = _rewardPerBlock;
        pool.lastRewardBlock = block.number;
    }

    function updatePool() internal{
        if(block.number <= pool.lastRewardBlock){
            return;
        }
        if(pool.totalStaked == 0){
            pool.lastRewardBlock = block.number;
            return;
        }
        uint256 blocksElapsed = block.number - pool.lastRewardBlock;
        uint256 rewards = pool.rewardPerBlock * blocksElapsed;

        pool.accRewardPerShare += (rewards * 1e12) / pool.totalStaked;
        pool.lastRewardBlock = block.number;
    }

    function pendingRewards(address _user) public view returns(uint256){
        User storage user = users[_user];
        uint256 accRewardPerShare = pool.accRewardPerShare;

        if(block.number > pool.lastRewardBlock && pool.totalStaked != 0){
            uint256 blocksElapsed = block.number - pool.lastRewardBlock;
            uint256 rewards = pool.rewardPerBlock * blocksElapsed;

            accRewardPerShare += (rewards * 1e12) / pool.totalStaked;
        }
        return (user.amount * accRewardPerShare) / 1e12 - user.rewardDebt;
    }

    function stake(uint256 amount) external{
        if(amount == 0){
            revert AmountMustBeGreaterThanZero();
        }

        updatePool();

        User storage user = users[msg.sender];

        if(user.amount > 0){
            uint256 pending = (user.amount * pool.accRewardPerShare) / 1e12 - user.rewardDebt;
            if(pending > 0){
                rewardToken.transfer(msg.sender, pending);
            }
        }

        user.amount += amount;
        pool.totalStaked += amount;
        user.rewardDebt = (user.amount * pool.accRewardPerShare) / 1e12;

        emit Staked(msg.sender, amount);
    }

    function harvest() external{
        updatePool();

        User storage user = users[msg.sender];
        
        uint256 pending = (user.amount * pool.accRewardPerShare) / 1e12 - user.rewardDebt;

        if(pending == 0){
            revert NothingToHarvest();
        }
        
        rewardToken.transfer(msg.sender, pending);

        user.rewardDebt = (user.amount * pool.accRewardPerShare) / 1e12;

        emit Harvested(msg.sender, pending);
    }

    function withdraw(uint256 amount) external{
        require(amount > 0, "Amount must be greater than zero");

        User storage user = users[msg.sender];

        if(user.amount < amount){
            revert InsufficientStakedBalance();
        }

        updatePool();

        uint256 pending = (user.amount * pool.accRewardPerShare) / 1e12 - user.rewardDebt;
        if(pending > 0){
            rewardToken.transfer(msg.sender, pending);
        }

        user.amount -= amount;
        pool.totalStaked -= amount;
        lpToken.transfer(msg.sender, amount);

        user.rewardDebt = (user.amount * pool.accRewardPerShare) / 1e12;

        emit Withdrawn(msg.sender, amount);
    }

    function emergencyWithdraw() external{
        User storage user = users[msg.sender];

        uint256 amount = user.amount;

        if(amount == 0){
            revert NothingStaked();
        }

        pool.totalStaked -= amount;
        user.amount = 0;
        user.rewardDebt = 0;

        lpToken.transfer((msg.sender), amount);

        emit EmergencyWithdraw(msg.sender, amount);
    }
}