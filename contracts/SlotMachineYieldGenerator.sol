// SPDX-License-Identifier: MIT
// An example of a consumer contract that relies on a subscription for funding.
pragma solidity 0.8.15;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "./interfaces/ISlotMachineYieldGenerator.sol";
import "./VRFv2Consumer.sol";
import "./lib/Math.sol";

contract SlotMachineYieldGenerator is
    ISlotMachineYieldGenerator,
    VRFv2Consumer,
    ERC20,
    ReentrancyGuard,
    Ownable,
    Pausable
{
    using Math for uint256;
    using Address for address;

    uint256 public rollPrice;
    uint256 public rewardPoolBalance;
    uint256 public protocolFee;
    uint256 public protocolRewardsBalance;

    uint256 public epochSeconds;
    uint256 public epochStartedAt;
    uint256 public exitFee;
    uint256 public rewardPoolBalanceAtEpochEnd;

    mapping(address => uint256) public depositTimestamp;
    mapping(address => uint256) public userBalance;
    mapping(uint256 => address) public userRequestId;

    event Roll(
        uint256 first,
        uint256 second,
        uint256 third,
        uint256 reward,
        uint256 requestId
    );
    event Deposit(address depositorAddress, uint256 depositAmount);
    event Withdraw(address requestorAddress, uint256 withdrawAmount);
    event EpochEnd(uint256 endTime, uint256 protocolReward);
    event LiquidityAdded(uint256 amount, uint256 liquidity);
    event LiquidityRemoved(uint256 amount, uint256 liquidity);

    modifier onlyEpochNotEnded() {
        require(
            block.timestamp < epochEndAt(),
            "Slot Mahchine: Current epoch has ended"
        );
        _;
    }

    constructor(
        uint256 _rollPrice,
        uint256 _protocolFee,
        uint256 _epochSeconds,
        uint256 _epochStartedAt,
        uint256 _exitFee,
        uint64 _subscriptionId,
        address _vrfCordinator
    )
        VRFv2Consumer(_subscriptionId, _vrfCordinator)
        ERC20("Coinbet Liquidity Provider Token", "C_LPT")
    {
        rollPrice = _rollPrice;
        protocolFee = _protocolFee;
        epochSeconds = _epochSeconds;
        epochStartedAt = _epochStartedAt;
        exitFee = _exitFee;
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
        uint256 reward = rollPrice.calculateReward(
            (randomWords[0] % 6) + 1,
            (randomWords[1] % 6) + 1,
            (randomWords[2] % 6) + 1
        );

        address user = userRequestId[requestId];

        if (reward > 0) {
            userBalance[user] += reward;
            rewardPoolBalance -= reward;
        }

        emit Roll(
            ((randomWords[0]) % 6) + 1,
            ((randomWords[1]) % 6) + 1,
            ((randomWords[2]) % 6) + 1,
            reward,
            requestId
        );
    }

    function depositFunds(address user)
        external
        payable
        whenNotPaused
    {
        userBalance[user] += msg.value;
        emit Deposit(user, msg.value);
    }

    function withdrawFunds(uint256 amount)
        external
        nonReentrant
        whenNotPaused
    {
        require(
            userBalance[_msgSender()] >= amount,
            "Slot Machine: Not enough funds"
        );
        userBalance[_msgSender()] -= amount;

        (bool success, ) = _msgSender().call{value: amount}("");
        require(success, "Slot Machine: Withdrawal failed");

        emit Withdraw(_msgSender(), amount);
    }

    function executeRoll()
        external
        nonReentrant
        whenNotPaused
        onlyEpochNotEnded
    {
        _beforeRollExecution();
        userBalance[_msgSender()] -= rollPrice;
        rewardPoolBalance += rollPrice;
        uint256 requestId = requestRandomWords();
        userRequestId[requestId] = _msgSender();
    }

    function addLiquidity()
        external
        payable
        onlyEpochNotEnded
        returns (uint256 liquidity)
    {
        uint256 _totalSupply = totalSupply();
        uint256 _reserve = rewardPoolBalance;
        uint256 amount = msg.value;

        if (_totalSupply == 0) {
            liquidity = (((amount / 2) * (amount)) / 2).sqrt();
        } else {
            liquidity = (amount * _totalSupply) / _reserve;
        }

        rewardPoolBalance += amount;
        depositTimestamp[msg.sender] = block.timestamp;

        require(liquidity > 0, "Slot Machine: Insuffcient Liquidity Minted");
        _mint(_msgSender(), liquidity);
        emit LiquidityAdded(amount, liquidity);
    }

    function removeLiquidity(uint256 liquidity)
        external
        onlyEpochNotEnded
        returns (uint256 amount)
    {
        _transfer(_msgSender(), address(this), liquidity);

        uint256 balance = rewardPoolBalance;
        uint256 _totalSupply = totalSupply();

        amount = (liquidity * balance) / _totalSupply;

        require(amount > 0, "Slot Machine: Insuffcient Liquidity Burned");

        _burn(address(this), liquidity);

        uint256 _exitFee = calculateLiquidityWithdrawalFee(
            amount,
            _msgSender()
        );

        (bool success, ) = _msgSender().call{value: (amount - _exitFee)}("");
        require(success, "Slot Machine: Withdrawal Failed");

        rewardPoolBalance -= amount;
        protocolRewardsBalance += _exitFee;
        emit LiquidityRemoved(amount, liquidity);
    }

    function withdrawProtocolFees()
        external
        returns (uint256 amount)
    {
        amount = protocolRewardsBalance;
        protocolRewardsBalance = 0;
        (bool success, ) = owner().call{value: amount}("");
        require(success, "Slot Machine: Withdrawal Failed");
    }

    function finalizeEpoch() public {
        require(hasEpochEnded(), "Slot Machine: Epoch has not ended");

        uint256 beginningBalance = rewardPoolBalanceAtEpochEnd;
        uint256 endBalance = rewardPoolBalance;
        uint256 protocolReward = 0;

        if (endBalance > beginningBalance) {
            protocolReward =
                ((endBalance - beginningBalance) * protocolFee) /
                10000;
            rewardPoolBalance -= protocolReward;
            protocolRewardsBalance += protocolReward;
        }

        rewardPoolBalanceAtEpochEnd = rewardPoolBalance;
        epochStartedAt = calculateNextEpochStartTime(block.timestamp);
        emit EpochEnd(epochStartedAt, protocolReward);
    }

    function _beforeRollExecution() internal view {
        require(
            !address(_msgSender()).isContract(),
            "Slot Machine: Caller cannot be a contract"
        );
        require(
            _msgSender() == tx.origin,
            "Slot Machine: Msg sender should be original caller"
        );
        require(
            userBalance[_msgSender()] >= rollPrice,
            "Slot Machine: Not enough funds"
        );
        require(
            rewardPoolBalance > rollPrice * 30,
            "Slot Machine: Not enough to pay max payout"
        );
    }

    function epochEndAt() public view returns (uint256) {
        return epochStartedAt + epochSeconds;
    }

    function hasEpochEnded() public view returns (bool) {
        return block.timestamp >= epochEndAt();
    }

    function calculateLiquidityWithdrawalFee(uint256 amount, address owner)
        internal
        view
        returns (uint256 withdrawalFee)
    {
        uint256 epochStartTime = epochStartedAt;
        uint256 depositedAt = depositTimestamp[owner];

        if (epochStartTime > depositedAt) {
            withdrawalFee = 0;
        } else {
            withdrawalFee = (exitFee * amount) / 10000;
        }
    }

    function calculateNextEpochStartTime(uint256 currentTime)
        internal
        view
        returns (uint256)
    {
        uint256 elapsedEpochs = (currentTime - epochStartedAt) / epochSeconds;
        return epochStartedAt + (elapsedEpochs * epochSeconds);
    }
}
