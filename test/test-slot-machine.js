const { expect } = require("chai");
const { waffle, ethers, upgrades } = require("hardhat");
const { loadFixture } = waffle;

const EXIT_FEE_BPS = "500";
const PROTOCOL_FEE_BPS = "200";
const REWARD_POOL_MAX_CAP = "1000000000000000000000";
const SUBSCRIPTION_ID = "0";
const KEY_HASH =
  "0xd4bb89654db74673a187bd804519e65e3f71a52bc55f11da7601a13dcf505314";
const CALLBACK_GAS_LIMIT = "2400000";
const VRF_REQUEST_CONFIRMATIONS = "3";
const NUM_WORDS = "3";
const EPOCH_SECONDS = "3600";
const EPOCH_STARTED_AT = Math.floor(new Date("2022.01.01").getTime() / 1000);
const COINBET_TOKEN_FEE_WAIVER_THRESHOLD = "1000000000000000000000";
const WITHDRAW_TIME_WINDOW_SECONDS = "60";
const COINBET_TOKEN_REWARD_MULTIPLIER = "5";
const FINALIZE_EPOCH_BONUS = "10000000000000000000";
const MAX_BET_TO_POOL_RATIO = "10";
const INCENTIVE_MODE = "true";
const MIN_BET_AMOUNT = "1000000000000000000";
const MAX_BET_AMOUNT = "10000000000000000000";

describe("Slot Machine Tests", () => {
  const deployedContracts = async () => {
    const MockVRFCoordinator = await hre.ethers.getContractFactory(
      "MockVRFCoordinator"
    );
    const mockVRFCoordinator = await MockVRFCoordinator.deploy();

    await mockVRFCoordinator.deployed();

    const CoinbetToken = await hre.ethers.getContractFactory("CoinbetToken");
    const coinbetToken = await CoinbetToken.deploy();

    await coinbetToken.deployed();

    const CoinbetHousePool = await hre.ethers.getContractFactory(
      "CoinbetHousePool"
    );
    const coinbetHousePool = await CoinbetHousePool.deploy(
      EXIT_FEE_BPS,
      REWARD_POOL_MAX_CAP,
      EPOCH_SECONDS,
      EPOCH_STARTED_AT,
      COINBET_TOKEN_FEE_WAIVER_THRESHOLD,
      WITHDRAW_TIME_WINDOW_SECONDS,
      COINBET_TOKEN_REWARD_MULTIPLIER,
      FINALIZE_EPOCH_BONUS,
      MAX_BET_TO_POOL_RATIO,
      coinbetToken.address,
      INCENTIVE_MODE
    );

    await coinbetHousePool.deployed();

    const CoinbetSlotMachine = await hre.ethers.getContractFactory(
      "CoinbetSlotMachine"
    );
    const coinbetSlotMachine = await CoinbetSlotMachine.deploy(
      MIN_BET_AMOUNT,
      MAX_BET_AMOUNT,
      COINBET_TOKEN_FEE_WAIVER_THRESHOLD,
      PROTOCOL_FEE_BPS,
      SUBSCRIPTION_ID,
      KEY_HASH,
      CALLBACK_GAS_LIMIT,
      VRF_REQUEST_CONFIRMATIONS,
      NUM_WORDS,
      mockVRFCoordinator.address,
      coinbetHousePool.address,
      coinbetToken.address
    );

    await coinbetSlotMachine.deployed();

    await coinbetHousePool.setAuthorizedCoinbetGame(
      coinbetSlotMachine.address,
      true
    );

    const CoinbetGameExecutor = await hre.ethers.getContractFactory(
      "CoinbetGameExecutor"
    );
    const coinbetGameExecutor = await CoinbetGameExecutor.deploy(
      coinbetSlotMachine.address
    );

    await coinbetGameExecutor.deployed();

    return {
      coinbetToken,
      mockVRFCoordinator,
      coinbetHousePool,
      coinbetSlotMachine,
      coinbetGameExecutor,
    };
  };

  it("should successfully deploy CoinbetHousePool with correct configuration", async () => {
    const { coinbetHousePool, coinbetToken } = await loadFixture(
      deployedContracts
    );

    const exitFeeBps = await coinbetHousePool.exitFeeBps();
    const poolMaxCap = await coinbetHousePool.poolMaxCap();
    const epochSeconds = await coinbetHousePool.epochSeconds();
    const epochStartedAt = await coinbetHousePool.epochStartedAt();
    const coinbetTokenRewardMultiplier =
      await coinbetHousePool.coinbetTokenRewardMultiplier();
    const coinbetTokenFeeWaiverThreshold =
      await coinbetHousePool.coinbetTokenFeeWaiverThreshold();
    const withdrawTimeWindowSeconds =
      await coinbetHousePool.withdrawTimeWindowSeconds();
    const finalizeEpochBonus = await coinbetHousePool.finalizeEpochBonus();
    const maxBetToPoolRatio = await coinbetHousePool.maxBetToPoolRatio();
    const incentiveMode = await coinbetHousePool.incentiveMode();
    const coinbetTokenAddress = await coinbetHousePool.coinbetToken();

    expect(exitFeeBps).to.equal(EXIT_FEE_BPS);
    expect(poolMaxCap).to.equal(REWARD_POOL_MAX_CAP);
    expect(epochSeconds).to.equal(EPOCH_SECONDS);
    expect(epochStartedAt).to.equal(EPOCH_STARTED_AT);
    expect(coinbetTokenRewardMultiplier).to.equal(
      COINBET_TOKEN_REWARD_MULTIPLIER
    );
    expect(coinbetTokenFeeWaiverThreshold).to.equal(
      COINBET_TOKEN_FEE_WAIVER_THRESHOLD
    );
    expect(withdrawTimeWindowSeconds).to.equal(WITHDRAW_TIME_WINDOW_SECONDS);
    expect(finalizeEpochBonus).to.equal(FINALIZE_EPOCH_BONUS);
    expect(maxBetToPoolRatio).to.equal(MAX_BET_TO_POOL_RATIO);
    expect(incentiveMode.toString()).to.equal(INCENTIVE_MODE);
    expect(coinbetTokenAddress).to.equal(coinbetToken.address);
  });

  it("should successfully deploy CoinbetSlotMachine with correct configuration", async () => {
    const { coinbetHousePool, coinbetToken, coinbetSlotMachine } =
      await loadFixture(deployedContracts);

    const minBetAmount = await coinbetSlotMachine.minBetAmount();
    const maxBetAmount = await coinbetSlotMachine.maxBetAmount();
    const protocolFeeBps = await coinbetSlotMachine.protocolFeeBps();
    const coinbetTokenFeeWaiverThreshold =
      await coinbetSlotMachine.coinbetTokenFeeWaiverThreshold();
    const housePool = await coinbetSlotMachine.housePool();
    const coinbetTokenAddress = await coinbetSlotMachine.coinbetToken();

    expect(minBetAmount).to.equal(MIN_BET_AMOUNT);
    expect(maxBetAmount).to.equal(MAX_BET_AMOUNT);
    expect(protocolFeeBps).to.equal(PROTOCOL_FEE_BPS);
    expect(housePool).to.equal(coinbetHousePool.address);
    expect(coinbetTokenFeeWaiverThreshold).to.equal(
      COINBET_TOKEN_FEE_WAIVER_THRESHOLD
    );
    expect(coinbetTokenAddress).to.equal(coinbetToken.address);
  });

  it("should successfully execute a spin", async () => {
    const { coinbetSlotMachine, coinbetHousePool } = await loadFixture(
      deployedContracts
    );
    const accounts = await ethers.getSigners();

    await coinbetHousePool
      .connect(accounts[0])
      .addRewardsLiquidity({ value: "900000000000000000000" });

    // Finalize epoch if ended
    await coinbetHousePool.finalizeEpoch();

    await expect(
      coinbetSlotMachine
        .connect(accounts[1])
        .coinbet({ value: "1000000000000000000" })
    ).to.be.emit(coinbetSlotMachine, "BetPlaced");
  });

  it("should successfully provide liquidity", async () => {
    const { coinbetHousePool } = await loadFixture(deployedContracts);
    const accounts = await ethers.getSigners();

    await expect(
      coinbetHousePool
        .connect(accounts[0])
        .addRewardsLiquidity({ value: "2000000000000000000" })
    ).to.be.emit(coinbetHousePool, "RewardsLiquidityAdded");
  });

  it("should NOT be able to provide liquidity above max cap", async () => {
    const { coinbetHousePool } = await loadFixture(deployedContracts);
    const accounts = await ethers.getSigners();

    await expect(
      coinbetHousePool
        .connect(accounts[0])
        .addRewardsLiquidity({ value: "1000000000000000000001" })
    ).revertedWith("Coinbet House Pool: Reward Pool Max Cap Exceeded");
  });

  it("should successfully mint LP Rewards Token after liquidity is provided", async () => {
    const { coinbetHousePool } = await loadFixture(deployedContracts);
    const accounts = await ethers.getSigners();

    await expect(
      coinbetHousePool
        .connect(accounts[0])
        .addRewardsLiquidity({ value: "2000000000000000000" })
    ).to.be.emit(coinbetHousePool, "RewardsLiquidityAdded");

    const lpTokenBalance = await coinbetHousePool.balanceOf(
      accounts[0].address
    );
    expect(lpTokenBalance).to.equal("1000000000000000000");
  });

  it("should successfully withdraw liquidity", async () => {
    const { coinbetHousePool } = await loadFixture(deployedContracts);
    const accounts = await ethers.getSigners();

    await expect(
      coinbetHousePool
        .connect(accounts[0])
        .addRewardsLiquidity({ value: "2000000000000000000" })
    ).to.be.emit(coinbetHousePool, "RewardsLiquidityAdded");

    await expect(
      coinbetHousePool
        .connect(accounts[0])
        .removeRewardsLiquidity("1000000000000000000")
    ).to.be.emit(coinbetHousePool, "RewardsLiquidityRemoved");

    const lpTokenBalance = await coinbetHousePool.balanceOf(
      accounts[0].address
    );
    expect(lpTokenBalance).to.equal("0");
  });

  it("should NOT be able to withdraw liquidity if you have not provided any", async () => {
    const { coinbetHousePool } = await loadFixture(deployedContracts);
    const accounts = await ethers.getSigners();

    await expect(
      coinbetHousePool
        .connect(accounts[0])
        .addRewardsLiquidity({ value: "2000000000000000000" })
    ).to.be.emit(coinbetHousePool, "RewardsLiquidityAdded");

    await expect(
      coinbetHousePool
        .connect(accounts[1])
        .removeRewardsLiquidity("1000000000000000000")
    ).revertedWith("ERC20: transfer amount exceeds balance");
  });

  it("should successfully deduct exit fee when withdrawing liquidity", async () => {
    const { coinbetHousePool } = await loadFixture(deployedContracts);
    const accounts = await ethers.getSigners();

    await expect(
      coinbetHousePool
        .connect(accounts[1])
        .addRewardsLiquidity({ value: "2000000000000000000" })
    ).to.be.emit(coinbetHousePool, "RewardsLiquidityAdded");

    await expect(
      coinbetHousePool
        .connect(accounts[1])
        .removeRewardsLiquidity("1000000000000000000")
    ).to.be.emit(coinbetHousePool, "RewardsLiquidityRemoved");

    const protocolRewardsBalance =
      await coinbetHousePool.protocolRewardsBalance();
    expect(protocolRewardsBalance).to.equal("100000000000000000");
  });

  it("Only owner should successfully withdraw protocol funds", async () => {
    const { coinbetHousePool } = await loadFixture(deployedContracts);
    const accounts = await ethers.getSigners();

    await expect(
      coinbetHousePool
        .connect(accounts[0])
        .addRewardsLiquidity({ value: "2000000000000000000" })
    ).to.be.emit(coinbetHousePool, "RewardsLiquidityAdded");

    await expect(
      coinbetHousePool
        .connect(accounts[0])
        .removeRewardsLiquidity("1000000000000000000")
    ).to.be.emit(coinbetHousePool, "RewardsLiquidityRemoved");

    await expect(
      coinbetHousePool.connect(accounts[1]).withdrawProtocolFees()
    ).revertedWith("Ownable: caller is not the owner");
    await coinbetHousePool.connect(accounts[0]).withdrawProtocolFees();
  });

  it("Only owner should successfully update minBet", async () => {
    const { coinbetSlotMachine } = await loadFixture(deployedContracts);
    const accounts = await ethers.getSigners();

    await expect(
      coinbetSlotMachine
        .connect(accounts[1])
        .updateMinBetAmount("20000000000000000")
    ).revertedWith("Ownable: caller is not the owner");

    await expect(
      coinbetSlotMachine
        .connect(accounts[0])
        .updateMinBetAmount("20000000000000000")
    ).to.be.emit(coinbetSlotMachine, "MinBetAmountUpdated");

    const newMinBetAmount = await coinbetSlotMachine.minBetAmount();
    expect(newMinBetAmount).to.equal("20000000000000000");
  });

  it("Only owner should successfully update maxBet", async () => {
    const { coinbetSlotMachine } = await loadFixture(deployedContracts);
    const accounts = await ethers.getSigners();

    await expect(
      coinbetSlotMachine
        .connect(accounts[1])
        .updateMaxBetAmount("20000000000000000")
    ).revertedWith("Ownable: caller is not the owner");

    await expect(
      coinbetSlotMachine
        .connect(accounts[0])
        .updateMaxBetAmount("20000000000000000")
    ).to.be.emit(coinbetSlotMachine, "MaxBetAmountUpdated");

    const newMaxBetAmount = await coinbetSlotMachine.maxBetAmount();
    expect(newMaxBetAmount).to.equal("20000000000000000");
  });

  it("Only owner should successfully update exit fee", async () => {
    const { coinbetHousePool } = await loadFixture(deployedContracts);
    const accounts = await ethers.getSigners();

    await expect(
      coinbetHousePool.connect(accounts[1]).updateExitFeeBps("1000")
    ).revertedWith("Ownable: caller is not the owner");

    await expect(
      coinbetHousePool.connect(accounts[0]).updateExitFeeBps("1000")
    ).to.be.emit(coinbetHousePool, "ExitFeeUpdated");

    const newExitFeeBps = await coinbetHousePool.exitFeeBps();
    expect(newExitFeeBps).to.equal("1000");
  });

  it("Only owner should successfully update protocol fee", async () => {
    const { coinbetSlotMachine } = await loadFixture(deployedContracts);
    const accounts = await ethers.getSigners();

    await expect(
      coinbetSlotMachine.connect(accounts[1]).updateProtocolFeeBps("1000")
    ).revertedWith("Ownable: caller is not the owner");

    await expect(
      coinbetSlotMachine.connect(accounts[0]).updateProtocolFeeBps("1000")
    ).to.be.emit(coinbetSlotMachine, "ProtocolFeeUpdated");

    const newProtocolFeeBps = await coinbetSlotMachine.protocolFeeBps();
    expect(newProtocolFeeBps).to.equal("1000");
  });

  it("Only owner should successfully update reward pool max cap", async () => {
    const { coinbetHousePool } = await loadFixture(deployedContracts);
    const accounts = await ethers.getSigners();

    await expect(
      coinbetHousePool
        .connect(accounts[1])
        .updateRewardPoolMaxCap("1000000000000000000")
    ).revertedWith("Ownable: caller is not the owner");

    await expect(
      coinbetHousePool
        .connect(accounts[0])
        .updateRewardPoolMaxCap("2000000000000000000")
    ).to.be.emit(coinbetHousePool, "RewardPoolMaxCapUpdated");

    const newRewardPoolMaxCap = await coinbetHousePool.poolMaxCap();
    expect(newRewardPoolMaxCap).to.equal("2000000000000000000");
  });

  it("should NOT execute coinbet if there are not enough funds to pay the highest possible prize", async () => {
    const { coinbetHousePool, coinbetSlotMachine } = await loadFixture(
      deployedContracts
    );
    const accounts = await ethers.getSigners();

    // Finalize epoch if ended
    await coinbetHousePool.finalizeEpoch();

    await expect(
      coinbetHousePool
        .connect(accounts[0])
        .addRewardsLiquidity({ value: "10000000000000000" })
    ).to.be.emit(coinbetHousePool, "RewardsLiquidityAdded");

    await expect(
      coinbetSlotMachine
        .connect(accounts[1])
        .coinbet({ value: "1000000000000000000" })
    ).revertedWith("Coinbet House Pool: Insufficient liquidity to payout bet");
  });

  it("should NOT be able to coinbet below minimum bet", async () => {
    const { coinbetSlotMachine, coinbetHousePool } = await loadFixture(
      deployedContracts
    );
    const accounts = await ethers.getSigners();

    await coinbetHousePool.finalizeEpoch();

    await expect(
      coinbetHousePool
        .connect(accounts[0])
        .addRewardsLiquidity({ value: "10000000000000000" })
    ).to.be.emit(coinbetHousePool, "RewardsLiquidityAdded");

    await expect(
      coinbetSlotMachine
        .connect(accounts[1])
        .coinbet({ value: "10000000000000000" })
    ).revertedWith("Coinbet Slot Machine: Invalid bet amount");
  });

  it("should NOT be able to able to execute a roll from a contract", async () => {
    const { coinbetHousePool, coinbetGameExecutor } = await loadFixture(
      deployedContracts
    );
    const accounts = await ethers.getSigners();
    expect(
      await coinbetHousePool
        .connect(accounts[0])
        .addRewardsLiquidity({ value: "900000000000000000000" })
    ).to.be.emit(coinbetHousePool, "RewardsLiquidityAdded");

    await expect(
      coinbetGameExecutor
        .connect(accounts[1])
        .executeGameFromContract({ value: "1500000000000000000" })
    ).revertedWith("Coinbet Slot Machine: Msg sender should be original caller");
  });

  it("should successfully update house pool balance after", async () => {
    const { coinbetSlotMachine, coinbetHousePool, mockVRFCoordinator } =
      await loadFixture(deployedContracts);
    const accounts = await ethers.getSigners();

    await coinbetHousePool.finalizeEpoch();
    await mockVRFCoordinator.setCombination(1);

    await coinbetHousePool
      .connect(accounts[1])
      .addRewardsLiquidity({ value: "900000000000000000000" });

    expect(
      await coinbetSlotMachine
        .connect(accounts[2])
        .coinbet({ value: "1000000000000000000" })
    ).to.be.emit(coinbetSlotMachine, "BetPlaced");

    await mockVRFCoordinator.triggerRawFulfillRandomWords();
    const housePoolBalance = await coinbetHousePool.poolBalance();
    expect(housePoolBalance).to.equal("886280000000000000000");
  });

  it("should successfully update reward pool balance if roll is lost", async () => {
    const { coinbetSlotMachine, coinbetHousePool, mockVRFCoordinator } =
      await loadFixture(deployedContracts);
    const accounts = await ethers.getSigners();

    await coinbetHousePool.finalizeEpoch();
    await mockVRFCoordinator.setCombination(0);

    await coinbetHousePool
      .connect(accounts[1])
      .addRewardsLiquidity({ value: "900000000000000000000" });

    expect(
      await coinbetSlotMachine
        .connect(accounts[2])
        .coinbet({ value: "1000000000000000000" })
    ).to.be.emit(coinbetSlotMachine, "BetPlaced");

    await mockVRFCoordinator.triggerRawFulfillRandomWords();
    const housePoolBalance = await coinbetHousePool.poolBalance();
    expect(housePoolBalance).to.equal("900980000000000000000");
  });

  it("should calculate properly the total LP percentage of the pool when providing liquidity ", async () => {
    const { coinbetHousePool } = await loadFixture(deployedContracts);
    const accounts = await ethers.getSigners();

    expect(
      await coinbetHousePool
        .connect(accounts[0])
        .addRewardsLiquidity({ value: "2000000000000000000" })
    ).to.be.emit(coinbetHousePool, "RewardsLiquidityAdded");

    const lpTokenBalance1 = await coinbetHousePool.balanceOf(
      accounts[0].address
    );
    expect(lpTokenBalance1).to.equal("1000000000000000000");

    expect(
      await coinbetHousePool
        .connect(accounts[1])
        .addRewardsLiquidity({ value: "1000000000000000000" })
    ).to.be.emit(coinbetHousePool, "RewardsLiquidityAdded");

    const lpTokenBalance2 = await coinbetHousePool.balanceOf(
      accounts[1].address
    );
    expect(lpTokenBalance2).to.equal("500000000000000000");

    expect(
      await coinbetHousePool
        .connect(accounts[2])
        .addRewardsLiquidity({ value: "1000000000000000000" })
    ).to.be.emit(coinbetHousePool, "RewardsLiquidityAdded");

    const lpTokenBalance3 = await coinbetHousePool.balanceOf(
      accounts[2].address
    );
    expect(lpTokenBalance3).to.equal("500000000000000000");

    expect(
      await coinbetHousePool
        .connect(accounts[3])
        .addRewardsLiquidity({ value: "2000000000000000000" })
    ).to.be.emit(coinbetHousePool, "RewardsLiquidityAdded");

    const lpTokenBalance4 = await coinbetHousePool.balanceOf(
      accounts[3].address
    );
    expect(lpTokenBalance4).to.equal("1000000000000000000");
  });

  it("should successfully deduct roll fee on roll execution", async () => {
    const { coinbetSlotMachine, mockVRFCoordinator, coinbetHousePool } =
      await loadFixture(deployedContracts);
    const accounts = await ethers.getSigners();

    await coinbetHousePool.finalizeEpoch();
    await mockVRFCoordinator.setCombination(0);

    await coinbetHousePool
      .connect(accounts[1])
      .addRewardsLiquidity({ value: "900000000000000000000" });

    expect(
      await coinbetSlotMachine
        .connect(accounts[1])
        .coinbet({ value: "1000000000000000000" })
    ).to.be.emit(coinbetSlotMachine, "BetPlaced");

    const rewardPoolBalance = await coinbetHousePool.poolBalance();
    expect(rewardPoolBalance).to.equal("900980000000000000000");
  });
});
