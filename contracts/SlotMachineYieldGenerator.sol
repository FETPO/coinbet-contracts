// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

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

    /* ========== STATE VARIABLES ========== */

    uint256 public rollPrice;
    uint256 public exitFeeBps;
    uint256 public rollFeeBps;
    uint256 public rewardPoolMaxCap;
    uint256 public rewardPoolBalance;
    uint256 public protocolRewardsBalance;

    mapping(address => uint256) public userBalance;
    mapping(uint256 => address) public userRequestId;

    /* ========== CONSTRUCTOR ========== */

    constructor(
        uint256 _rollPrice,
        uint256 _exitFeeBps,
        uint256 _rollFeeBps,
        uint256 _rewardPoolMaxCap,
        uint64 _subscriptionId,
        bytes32 _keyHash,
        uint32 _callbackGasLimit,
        uint16 _requestConfirmations,
        uint32 _numWords,
        address _vrfCordinator
    )
        VRFv2Consumer(
            _subscriptionId,
            _keyHash,
            _callbackGasLimit,
            _requestConfirmations,
            _numWords,
            _vrfCordinator
        )
        ERC20("Coinbet Rewards Provider Token", "CRPT")
    {
        rollPrice = _rollPrice;
        exitFeeBps = _exitFeeBps;
        rollFeeBps = _rollFeeBps;
        rewardPoolMaxCap = _rewardPoolMaxCap;
    }

    /* ========== VIEWS ========== */

    /// @notice Checks whether all conditions are met, before a roll is executed.
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

    /// TODO: Add different battle-tested logic for reward calculation
    /// @notice Calculates the current reward, based on the rollPrice and random values returned from Chainlink.
    /// @param slotRollPrice The roll price.
    /// @param firstRandom The first random number received.
    /// @param secondRandom The second random number received.
    /// @param thirdRandom The third random number received.
    function _calculateReward(
        uint256 slotRollPrice,
        uint256 firstRandom,
        uint256 secondRandom,
        uint256 thirdRandom
    ) internal pure returns (uint256) {
        if (firstRandom == 6 && secondRandom == 6 && thirdRandom == 6) {
            return slotRollPrice * 30;
        } else if (firstRandom == 5 && secondRandom == 5 && thirdRandom == 5) {
            return slotRollPrice * 20;
        } else if (firstRandom == 4 && secondRandom == 4 && thirdRandom == 4) {
            return slotRollPrice * 15;
        } else if (firstRandom == 3 && secondRandom == 3 && thirdRandom == 3) {
            return slotRollPrice * 12;
        } else if (firstRandom == 2 && secondRandom == 2 && thirdRandom == 2) {
            return slotRollPrice * 10;
        } else if (firstRandom == 1 && secondRandom == 1 && thirdRandom == 1) {
            return slotRollPrice * 5;
        } else if (
            (firstRandom == secondRandom) ||
            (firstRandom == thirdRandom) ||
            (secondRandom == thirdRandom)
        ) {
            return slotRollPrice;
        } else {
            return 0;
        }
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    /// @notice Deposits funds to an address, which can execute rolls.
    /// @param user The address of the user which will use the funds to play.
    function depositPlayerFunds(address user)
        external
        payable
        nonReentrant
        whenNotPaused
    {
        userBalance[user] += msg.value;

        emit DepositPlayerFunds(user, msg.value);
    }

    /// @notice Withdraws user funds, which were depoisted for playing.
    /// @param amount The amount which the user withdraws.
    function withdrawPlayerFunds(uint256 amount)
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

        emit WithdrawPlayerFunds(_msgSender(), amount);
    }

    /// @notice Executes a slot machine roll by player, who has enough balance.
    function executeRoll() external nonReentrant whenNotPaused {
        _beforeRollExecution();

        uint256 _rollPrice = rollPrice;
        uint256 _rollFee = (rollFeeBps * _rollPrice) / 10000;

        userBalance[_msgSender()] -= _rollPrice;
        rewardPoolBalance += (_rollPrice - _rollFee);
        protocolRewardsBalance += _rollFee;

        uint256 requestId = requestRandomWords();
        userRequestId[requestId] = _msgSender();
    }

    /// @notice Adds liquidity used for paying rewards to player and accumulating rewards from players rolls.
    /// ERC20 token is minted, which represents a percantage of the total pool.
    function addRewardsLiquidity()
        external
        payable
        nonReentrant
        whenNotPaused
        returns (uint256 liquidity)
    {
        uint256 _totalSupply = totalSupply();
        uint256 _reserve = rewardPoolBalance;
        uint256 amount = msg.value;

        require(
            _reserve + amount <= rewardPoolMaxCap,
            "Slot Machine: Reward Pool Max Cap Exceeded"
        );

        if (_totalSupply == 0) {
            liquidity = amount / 2;
        } else {
            liquidity = (amount * _totalSupply) / _reserve;
        }

        rewardPoolBalance += amount;

        require(liquidity > 0, "Slot Machine: Insuffcient Liquidity Minted");
        _mint(_msgSender(), liquidity);

        emit RewardsLiquidityAdded(amount, liquidity, _msgSender());
    }

    /// @notice Removes liquidity used for paying rewards to player and accumulating rewards from players rolls.
    /// ERC20 token is burned, which represents a percantage of the total pool.
    function removeRewardsLiquidity(uint256 liquidity)
        external
        nonReentrant
        whenNotPaused
        returns (uint256 amount)
    {
        _transfer(_msgSender(), address(this), liquidity);

        uint256 balance = rewardPoolBalance;
        uint256 _totalSupply = totalSupply();

        amount = (liquidity * balance) / _totalSupply;

        require(amount > 0, "Slot Machine: Insuffcient Liquidity Burned");

        _burn(address(this), liquidity);

        uint256 _exitFee = (exitFeeBps * amount) / 10000;

        (bool success, ) = _msgSender().call{value: (amount - _exitFee)}("");
        require(success, "Slot Machine: Withdrawal Failed");

        rewardPoolBalance -= amount;
        protocolRewardsBalance += _exitFee;

        emit RewardsLiquidityRemoved(amount, liquidity, _msgSender());
    }

    /// @notice Withdraws aggregated protocol fees to the owner of the contract.
    function withdrawProtocolFees()
        external
        nonReentrant
        onlyOwner
        returns (uint256 amount)
    {
        amount = protocolRewardsBalance;
        protocolRewardsBalance = 0;
        (bool success, ) = owner().call{value: amount}("");
        require(success, "Slot Machine: Withdrawal Failed");
    }

    /// @notice Updates the roll price for playing.
    /// @param newRollPrice The new roll price.
    function updateRollPrice(uint256 newRollPrice) external onlyOwner {
        rollPrice = newRollPrice;

        emit RollPriceUpdated(newRollPrice);
    }

    /// @notice Updates the exit fee for withdrawing rewards liquidity.
    /// @param newExitFeeBps The new exit fee in basis points.
    function updateExitFeeBps(uint256 newExitFeeBps) external onlyOwner {
        exitFeeBps = newExitFeeBps;

        emit ExitFeeUpdated(newExitFeeBps);
    }

    /// @notice Updates the reward pool max cap.
    /// @param newMaxCap The new max cap in wei.
    function updateRewardPoolMaxCap(uint256 newMaxCap) external onlyOwner {
        rewardPoolMaxCap = newMaxCap;

        emit RewardPoolMaxCapUpdated(newMaxCap);
    }

    /// @notice Updates the roll fee deducted on every roll.
    /// @param newRollFeeBps The new roll fee in basis points.
    function updateRollFeeBps(uint256 newRollFeeBps) external onlyOwner {
        rollFeeBps = newRollFeeBps;

        emit RollFeeUpdated(newRollFeeBps);
    }

    /// @notice Requests randomness from Chainlink. Called inside executeRoll.
    /// Assumes the subscription is funded sufficiently.
    function requestRandomWords() internal returns (uint256 _userRequestId) {
        _userRequestId = COORDINATOR.requestRandomWords(
            keyHash,
            s_subscriptionId,
            requestConfirmations,
            callbackGasLimit,
            numWords
        );
    }

    /// @notice Callback function, executed by Chainlink's VRF Coordinator contract.
    /// @param requestId The respective request id.
    /// @param randomWords Array of random numbers fulfilled.
    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords)
        internal
        override
    {
        uint256 _rollPrice = rollPrice;
        uint256 _rollFee = (rollFeeBps * _rollPrice) / 10000;

        uint256 reward = _calculateReward(
            (_rollPrice - _rollFee),
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

    /* ========== EVENTS ========== */

    event Roll(
        uint256 first,
        uint256 second,
        uint256 third,
        uint256 reward,
        uint256 requestId
    );
    event DepositPlayerFunds(address depositorAddress, uint256 depositAmount);
    event WithdrawPlayerFunds(
        address withdrawalAddress,
        uint256 withdrawAmount
    );
    event RewardsLiquidityAdded(
        uint256 amount,
        uint256 liquidity,
        address providerAddress
    );
    event RewardsLiquidityRemoved(
        uint256 amount,
        uint256 liquidity,
        address providerAddress
    );
    event RollPriceUpdated(uint256 newRollPrice);
    event ExitFeeUpdated(uint256 newExitFeeBps);
    event RewardPoolMaxCapUpdated(uint256 newMaxCap);
    event RollFeeUpdated(uint256 newRollFeeBps);
}
