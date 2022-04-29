// SPDX-License-Identifier: MIT
// An example of a consumer contract that relies on a subscription for funding.
pragma solidity 0.8.13;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IRewardPool.sol";
import "./interfaces/ISlotMachine.sol";
import "./VRFv2Consumer.sol";

contract SlotMachine is
    ISlotMachine,
    VRFv2Consumer,
    ReentrancyGuard,
    Ownable,
    Pausable
{
    uint256 public rollPrice;

    mapping(address => uint256) public userBalance;
    mapping(uint256 => address) public userRequestId;

    IRewardPool public rewardPool;

    constructor(
        uint256 _rollPrice,
        address _rewardPool,
        uint64 _subscriptionId,
        address _vrfCordinator
    ) VRFv2Consumer(_subscriptionId, _vrfCordinator) {
        rollPrice = _rollPrice;
        rewardPool = IRewardPool(_rewardPool);
        s_subscriptionId = _subscriptionId;
    }

    // Assumes the subscription is funded sufficiently.
    function requestRandomWords() internal returns (uint256 _userRequestId) {
        // Will revert if subscription is not set and funded.
        _userRequestId = COORDINATOR.requestRandomWords(
            keyHash,
            s_subscriptionId,
            requestConfirmations,
            callbackGasLimit,
            numWords
        );
    }

    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords)
        internal
        override
    {
        uint256 reward = calculateReward(
            (expand(randomWords[0]) % 6) + 1,
            (expand(randomWords[1]) % 6) + 1,
            (expand(randomWords[2]) % 6) + 1
        );

        address user = userRequestId[requestId];

        if (reward > 0) {
            userBalance[user] += reward;
            rewardPool.awardWinner(reward, user);
        } else {
            rewardPool.addFunds{value: rollPrice}();
        }

        emit Roll(
            (expand(randomWords[0]) % 6) + 1,
            (expand(randomWords[1]) % 6) + 1,
            (expand(randomWords[2]) % 6) + 1,
            reward,
            requestId
        );
    }

    /// @notice Deposit funds
    function depositFunds(address user) external payable whenNotPaused {
        userBalance[user] += msg.value;
        emit Deposit(user, msg.value);
    }

    /// @notice Withdraw funds
    function withdrawFunds(uint256 amount) external nonReentrant whenNotPaused {
        require(
            userBalance[_msgSender()] >= amount,
            "Slot Machine: Not enough funds"
        );
        userBalance[_msgSender()] -= amount;

        (bool success, ) = _msgSender().call{value: amount}("");
        require(success, "Slot Machine: Withdrawal failed");

        emit Withdraw(_msgSender(), amount);
    }

    /// @notice Execute slot machine roll
    function executeRoll() external nonReentrant whenNotPaused {
        require(
            userBalance[_msgSender()] >= rollPrice,
            "Slot Machine: Not enough funds"
        );
        require(
            rewardPool.rewardsBalance() > rollPrice * 30,
            "Not enough to pay max payout"
        );
        userBalance[_msgSender()] -= rollPrice;
        uint256 requestId = requestRandomWords();
        userRequestId[requestId] = _msgSender();
    }

    function expand(uint256 randomValue)
        internal
        pure
        returns (uint256 expandedValues)
    {
        return uint256(keccak256(abi.encode(randomValue)));
    }

    function calculateReward(
        uint256 firstRandom,
        uint256 secondRandom,
        uint256 thirdRandom
    ) internal view returns (uint256) {
        if (firstRandom == 6 && secondRandom == 6 && thirdRandom == 6) {
            return rollPrice * 30;
        } else if (firstRandom == 5 && secondRandom == 5 && thirdRandom == 5) {
            return rollPrice * 20;
        } else if (firstRandom == 4 && secondRandom == 4 && thirdRandom == 4) {
            return rollPrice * 15;
        } else if (firstRandom == 3 && secondRandom == 3 && thirdRandom == 3) {
            return rollPrice * 12;
        } else if (firstRandom == 2 && secondRandom == 2 && thirdRandom == 2) {
            return rollPrice * 10;
        } else if (firstRandom == 1 && secondRandom == 1 && thirdRandom == 1) {
            return rollPrice * 5;
        } else if (
            (firstRandom == secondRandom) ||
            (firstRandom == thirdRandom) ||
            (secondRandom == thirdRandom)
        ) {
            return rollPrice;
        } else {
            return 0;
        }
    }

    /* ========== EVENTS ========== */

    event Roll(
        uint256 first,
        uint256 second,
        uint256 third,
        uint256 reward,
        uint256 requestId
    );
    event Deposit(address depositorAddress, uint256 depositAmount);
    event Withdraw(address requestorAddress, uint256 withdrawAmount);
}
