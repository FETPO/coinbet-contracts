// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/ICoinbetHousePool.sol";

contract CoinbetHousePool is ICoinbetHousePool, ERC20, Ownable, Pausable {
    /* ========== STATE VARIABLES ========== */

    uint256 public exitFeeBps;
    uint256 public poolMaxCap;
    uint256 public poolBalance;
    uint256 public immutable epochSeconds;
    uint256 public epochStartedAt;
    uint256 public maxBetToPoolRatio;
    uint256 public pendingBetsAmount;
    uint256 public finalizeEpochBonus;
    uint256 public protocolRewardsBalance;
    uint256 public withdrawTimeWindowSeconds;
    uint256 public coinbetTokenRewardMultiplier;
    uint256 public coinbetTokenFeeWaiverThreshold;

    bool public incentiveMode;
    IERC20 public immutable coinbetToken;

    /// Mapping of addresses allowed to call the House Pool Contract
    mapping(address => bool) public authorizedGames;

    modifier onlyCoinbetGame() {
        require(
            authorizedGames[_msgSender()],
            "Coinbet House Pool: Not called from the Coinbet Slot Machine!"
        );
        _;
    }

    modifier onlyEpochNotEnded() {
        require(
            block.timestamp < epochEndAt(),
            "Coinbet House Pool: Current epoch has ended"
        );
        _;
    }

    modifier onlyEpochEnded() {
        require(
            block.timestamp >= epochEndAt(),
            "Coinbet House Pool: Current epoch has not ended"
        );
        _;
    }

    receive() external payable {
        protocolRewardsBalance += msg.value;
        emit HousePoolDonation(msg.sender, msg.value);
    }

    /* ========== CONSTRUCTOR ========== */

    constructor(
        uint256 _exitFeeBps,
        uint256 _poolMaxCap,
        uint256 _epochSeconds,
        uint256 _epochStartedAt,
        uint256 _coinbetTokenFeeWaiverThreshold,
        uint256 _withdrawTimeWindowSeconds,
        uint256 _coinbetTokenRewardMultiplier,
        uint256 _finalizeEpochBonus,
        uint256 _maxBetToPoolRatio,
        address _coinbetTokenAddress,
        bool _incentiveMode
    ) ERC20("Coinbet House Pool Token", "CHPT") {
        exitFeeBps = _exitFeeBps;
        poolMaxCap = _poolMaxCap;
        epochSeconds = _epochSeconds;
        epochStartedAt = _epochStartedAt;
        coinbetTokenRewardMultiplier = _coinbetTokenRewardMultiplier;
        coinbetTokenFeeWaiverThreshold = _coinbetTokenFeeWaiverThreshold;
        withdrawTimeWindowSeconds = _withdrawTimeWindowSeconds;
        finalizeEpochBonus = _finalizeEpochBonus;
        maxBetToPoolRatio = _maxBetToPoolRatio;

        incentiveMode = _incentiveMode;
        coinbetToken = IERC20(_coinbetTokenAddress);
    }

    /* ========== VIEWS ========== */

    /// @notice Returns the Coinbet's token balance of the HousePool
    function coinbetTokenBalance() public view returns (uint256) {
        return IERC20(coinbetToken).balanceOf(address(this));
    }

    /// @notice Returns the avaialble funds for Payroll after deducting pending bets amount
    function availableFundsForPayroll() public view returns (uint256) {
        return (poolBalance - pendingBetsAmount) / maxBetToPoolRatio;
    }

    /// @notice Returns the timestamp when the current epoch will end
    function epochEndAt() public view returns (uint256) {
        return epochStartedAt + epochSeconds;
    }

    /// @notice Returns boolean if the epoch has ended
    function hasEpochEnded() external view returns (bool) {
        return block.timestamp >= epochEndAt();
    }

    /// @notice Returns the current block timestamp
    function getCurrentTime() public view returns (uint256) {
        return block.timestamp;
    }

    /// @notice Calculates the next epoch start time
    /// @param currentTime The current block timestamp
    function calculateNextEpochStartTime(uint256 currentTime)
        internal
        view
        returns (uint256)
    {
        uint256 elapsedEpochs = (currentTime - epochStartedAt) / epochSeconds;
        return epochStartedAt + (elapsedEpochs * epochSeconds);
    }

    /// @notice Calculates the exit fee. If the provider holds a certain amount of $CFI tokens
    /// the exit fee is waived. The minimum amount coinbet tokens is set in the constructor
    /// @param _withdrawAmount The amount withdrawn
    /// @param _exitFeeBps The exit fee in basis points
    /// @param _lpProvider The address of the LP provider who withdraws
    function calculateProtocolFee(
        uint256 _withdrawAmount,
        uint256 _exitFeeBps,
        address _lpProvider
    ) internal view returns (uint256 exitFee) {
        uint256 tokenBalance = coinbetToken.balanceOf(_lpProvider);
        if (tokenBalance >= coinbetTokenFeeWaiverThreshold) {
            exitFee = 0;
        } else {
            exitFee = (_exitFeeBps * _withdrawAmount) / 10000;
        }
    }

    /// @notice Converts the LP token amount to staked token amount
    /// @param liquidity The ERC20 LP token amount
    function convertLiquidityToStakedToken(uint256 liquidity)
        external
        view
        returns (uint256 amount)
    {
        uint256 balance = poolBalance;
        uint256 _totalSupplyPoolToken = totalSupply();

        if (_totalSupplyPoolToken == 0) {
            amount = 0;
        } else {
            // slither-disable-next-line divide-before-multiply
            amount = (liquidity * balance) / _totalSupplyPoolToken;
        }
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    /// @notice Adds liquidity used for paying rewards to player and accumulating rewards from players rolls.
    /// ERC20 token is minted, which represents a percantage of the total pool.
    function addRewardsLiquidity()
        external
        payable
        whenNotPaused
        returns (uint256 liquidity)
    {
        uint256 _totalSupplyPoolToken = totalSupply();
        uint256 _reserve = poolBalance;
        uint256 amount = msg.value;

        require(
            _reserve + amount <= poolMaxCap,
            "Coinbet House Pool: Reward Pool Max Cap Exceeded"
        );

        if (_totalSupplyPoolToken == 0) {
            liquidity = amount / 2;
        } else {
            liquidity = (amount * _totalSupplyPoolToken) / _reserve;
        }

        poolBalance += amount;

        require(
            liquidity > 0,
            "Coinbet House Pool: Insuffcient Liquidity Minted"
        );
        _mint(_msgSender(), liquidity);

        emit RewardsLiquidityAdded(amount, liquidity, _msgSender());
    }

    /// @notice Removes liquidity used for paying rewards to player and accumulating rewards from players rolls.
    /// ERC20 token is burned, which represents a percantage of the total pool.
    function removeRewardsLiquidity(uint256 liquidity)
        external
        whenNotPaused
        onlyEpochEnded
        returns (uint256 amount)
    {
        _transfer(_msgSender(), address(this), liquidity);

        uint256 balance = poolBalance;
        uint256 _totalSupplyPoolToken = totalSupply();

        // slither-disable-next-line divide-before-multiply
        amount = (liquidity * balance) / _totalSupplyPoolToken;

        require(amount > 0, "Coinbet House Pool: Insuffcient Liquidity Burned");

        _burn(address(this), liquidity);

        uint256 _exitFee = calculateProtocolFee(
            amount,
            exitFeeBps,
            _msgSender()
        );

        poolBalance -= amount;
        protocolRewardsBalance += _exitFee;

        emit RewardsLiquidityRemoved(amount, liquidity, _msgSender());

        (bool success, ) = _msgSender().call{value: (amount - _exitFee)}("");
        require(success, "Coinbet House Pool: Withdrawal Failed");
    }

    /// @notice Withdraws aggregated protocol fees to the owner of the contract.
    function withdrawProtocolFees()
        external
        onlyOwner
        returns (uint256 amount)
    {
        amount = protocolRewardsBalance;
        protocolRewardsBalance = 0;

        emit ProtocolFeesWithdrawn(amount);

        (bool success, ) = owner().call{value: amount}("");
        require(success, "Coinbet House Pool: Withdrawal Failed");
    }

    /// @notice Withdraws CFI token from contract
    function withdrawCoinbetToken()
        external
        onlyOwner
        onlyEpochEnded
        returns (uint256 amount)
    {
        amount = coinbetTokenBalance();
        emit CoinbetTokenWithdrawn(amount);
        require(
            coinbetToken.transfer(owner(), amount),
            "Coinbet House Pool: Transcation Failed"
        );
    }

    /// @notice Updates the max bet to pool ration
    /// @param newMaxBetToPoolRatio The new max bet to pool ratio.
    function updateMaxBetToPoolRatio(uint256 newMaxBetToPoolRatio)
        external
        onlyOwner
        onlyEpochEnded
    {
        maxBetToPoolRatio = newMaxBetToPoolRatio;

        emit MaxBetToPoolRatioUpdated(newMaxBetToPoolRatio);
    }

    /// @notice Updates the incentiveMode value, used to distribute $CFI to players
    /// @param newIncentiveMode The new incentive mode true/false.
    function updateIncentiveMode(bool newIncentiveMode)
        external
        onlyOwner
        onlyEpochEnded
    {
        incentiveMode = newIncentiveMode;

        emit IncentiveModeUpdated(newIncentiveMode);
    }

    /// @notice Updates the $CFI token reward multiplier, rewarded on every bet.
    /// @param newRewardMultiplier The new $CFI token reward multiplier.
    function updateCoinbetTokenRewardMultiplier(uint256 newRewardMultiplier)
        external
        onlyOwner
        onlyEpochEnded
    {
        coinbetTokenRewardMultiplier = newRewardMultiplier;

        emit CoinbetTokenRewardMultiplierUpdated(newRewardMultiplier);
    }

    /// @notice Updates the finalizeEpoch bonus in $CFI tokens
    /// @param newFinalizeEpochBonus The new bonus amount.
    function updateFinalizeEpochBonus(uint256 newFinalizeEpochBonus)
        external
        onlyOwner
        onlyEpochEnded
    {
        finalizeEpochBonus = newFinalizeEpochBonus;

        emit FinalizeEpochBonusUpdated(newFinalizeEpochBonus);
    }

    /// @notice Updates the threshold of CFI token a liquidity provider should have.
    /// @param newThreshold The new threshold amount in CFI tokens.
    function updateCoinbetTokenFeeWaiverThreshold(uint256 newThreshold)
        external
        onlyOwner
        onlyEpochEnded
    {
        coinbetTokenFeeWaiverThreshold = newThreshold;

        emit CoinbetTokenFeeWaiverThresholdUpdated(newThreshold);
    }

    /// @notice Updates the the withdraw time window for LPs in seconds.
    /// @param newTimeWindowSeconds The new time window in seconds
    function updateWithdrawTimeWindowSeconds(uint256 newTimeWindowSeconds)
        external
        onlyOwner
        onlyEpochEnded
    {
        withdrawTimeWindowSeconds = newTimeWindowSeconds;

        emit WithdrawTimeWindowSecondsUpdated(newTimeWindowSeconds);
    }

    /// @notice Updates the exit fee for withdrawing rewards liquidity.
    /// @param newExitFeeBps The new exit fee in basis points.
    function updateExitFeeBps(uint256 newExitFeeBps)
        external
        onlyOwner
        onlyEpochEnded
    {
        exitFeeBps = newExitFeeBps;

        emit ExitFeeUpdated(newExitFeeBps);
    }

    /// @notice Updates the reward pool max cap.
    /// @param newMaxCap The new max cap in wei.
    function updateRewardPoolMaxCap(uint256 newMaxCap)
        external
        onlyOwner
        onlyEpochEnded
    {
        poolMaxCap = newMaxCap;

        emit RewardPoolMaxCapUpdated(newMaxCap);
    }

    /// @notice Pauses the contract.
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Updates the Coinbet Slot Machine connected to the House Pool
    /// @param coinbetGameAddress The new Coinbet game address
    /// @param isAuthorized True or False
    function setAuthorizedCoinbetGame(
        address coinbetGameAddress,
        bool isAuthorized
    ) external onlyOwner onlyEpochEnded {
        authorizedGames[coinbetGameAddress] = isAuthorized;
        emit AuthorizedGameUpdated(coinbetGameAddress, isAuthorized);
    }

    /// @notice Places a bet, only called by the game contract
    /// @param protocolFee The protocol fee which should be deducted
    function placeBet(
        uint256 protocolFee,
        address player,
        uint256 maxWinnableAmount
    ) external payable onlyCoinbetGame onlyEpochNotEnded {
        require(
            maxWinnableAmount <= availableFundsForPayroll(),
            "Coinbet House Pool: Insufficient liquidity to payout bet"
        );
        uint256 betAmount = msg.value;
        uint256 coinbetTokenAmount = betAmount * coinbetTokenRewardMultiplier;
        pendingBetsAmount += maxWinnableAmount;

        poolBalance += (betAmount - protocolFee);
        protocolRewardsBalance += protocolFee;

        if (incentiveMode && coinbetTokenAmount <= coinbetTokenBalance()) {
            require(
                coinbetToken.transfer(player, coinbetTokenAmount),
                "Coinbet House Pool: Transcation Failed"
            );
        }
    }

    /// @notice Settles a bet and transfers win amount to winner, only called by the game contract
    /// @param winAmount The amount which should be transfered
    /// @param player Address of the winner
    function settleBet(
        uint256 winAmount,
        address player,
        uint256 maxWinnableAmount
    ) external onlyCoinbetGame {
        // Deduct the winning amount from the reward pool balance and update the bet as settled
        poolBalance -= winAmount;
        // Deduct the max winnable amount from the pending bets amount
        pendingBetsAmount -= maxWinnableAmount;

        // Transfer the won funds back to the player
        // slither-disable-next-line arbitrary-send-eth
        (bool success, ) = payable(player).call{value: winAmount}("");
        require(success, "Coinbet House Pool: Withdrawal Failed");
    }

    /// @notice Finalizes the last elapsed epoch. The protocol allows for a time window
    /// where, liquidity providers have the option to withdraw their stake, as the funds are locked
    /// during the time the epoch is active. The function is callable by anyone - the first who calls it
    /// receives a $CFI token prize
    function finalizeEpoch() external onlyEpochEnded {
        uint256 timeSinceEpochEnd = getCurrentTime() - epochEndAt();
        require(
            timeSinceEpochEnd > withdrawTimeWindowSeconds,
            "Coinbet House Pool: Withdraw phase has not ended"
        );
        epochStartedAt = calculateNextEpochStartTime(block.timestamp);

        emit EpochEnded(epochStartedAt);

        if (finalizeEpochBonus <= coinbetTokenBalance()) {
            require(
                coinbetToken.transfer(msg.sender, finalizeEpochBonus),
                "Coinbet House Pool: Transcation Failed"
            );
        }
    }

    /* ========== EVENTS ========== */

    event ExitFeeUpdated(uint256 newExitFeeBps);
    event EpochEnded(uint256 newEpochStartedAt);
    event ProtocolFeesWithdrawn(uint256 amount);
    event CoinbetTokenWithdrawn(uint256 amount);
    event RewardPoolMaxCapUpdated(uint256 newMaxCap);
    event IncentiveModeUpdated(bool newIncentiveMode);
    event HousePoolDonation(address sender, uint256 amount);
    event MaxBetToPoolRatioUpdated(uint256 newMaxBetToPoolRatio);
    event FinalizeEpochBonusUpdated(uint256 newFinalizeEpochBonus);
    event CoinbetTokenFeeWaiverThresholdUpdated(uint256 newThreshold);
    event WithdrawTimeWindowSecondsUpdated(uint256 newTimeWindowSeconds);
    event CoinbetTokenRewardMultiplierUpdated(uint256 newRewardMultiplier);
    event AuthorizedGameUpdated(address coinbetGameAddress, bool isAuthorized);
    event RewardsLiquidityAdded(uint256 amount, uint256 liquidity, address providerAddress);
    event RewardsLiquidityRemoved(uint256 amount, uint256 liquidity, address providerAddress);
}
