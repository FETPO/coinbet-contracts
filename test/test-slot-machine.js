const { expect } = require("chai");

const { waffle, ethers, upgrades } = require("hardhat");
const { loadFixture } = waffle;

const ROLL_PRICE = "10000000000000000";
const EXIT_FEE_BPS = "500";
const ROLL_FEE_BPS = "200";
const REWARD_POOL_MAX_CAP = "100000000000000000000";
const SUBSCRIPTION_ID = "0";
const KEY_HASH = "0xd4bb89654db74673a187bd804519e65e3f71a52bc55f11da7601a13dcf505314";
const CALLBACK_GAS_LIMIT = "2400000";
const VRF_REQUEST_CONFIRMATIONS = "3";
const NUM_WORDS = "3";
const ADDRESS_ZERO = "0x0000000000000000000000000000000000000000";

describe("Slot Machine Tests", () => {
  const deployedContracts = async () => {
    const MockVRFCoordinator = await hre.ethers.getContractFactory("MockVRFCoordinator");
    const mockVRFCoordinator = await MockVRFCoordinator.deploy();

    const SlotMachineYieldGenerator = await hre.ethers.getContractFactory("SlotMachineYieldGenerator");
    const slotMachineYieldGenerator = await SlotMachineYieldGenerator.deploy(
      ROLL_PRICE,
      EXIT_FEE_BPS,
      ROLL_FEE_BPS,
      REWARD_POOL_MAX_CAP,
      SUBSCRIPTION_ID,
      KEY_HASH,
      CALLBACK_GAS_LIMIT,
      VRF_REQUEST_CONFIRMATIONS,
      NUM_WORDS,
      mockVRFCoordinator.address
    );

    await slotMachineYieldGenerator.deployed();

    const SlotMachineExecutor = await hre.ethers.getContractFactory("SlotMachineExecutor");
    const slotMachineExecutor = await SlotMachineExecutor.deploy(slotMachineYieldGenerator.address);

    await slotMachineExecutor.deployed();

    return { slotMachineYieldGenerator, mockVRFCoordinator, slotMachineExecutor };
  };

  it("should successfully deploy SlotMachineYieldGenerator with correct configuration", async () => {
    const { slotMachineYieldGenerator } = await loadFixture(deployedContracts);
    const accounts = await ethers.getSigners();

    const rollPrice = await slotMachineYieldGenerator.rollPrice();
    const exitFeeBps = await slotMachineYieldGenerator.exitFeeBps();

    expect(rollPrice).to.equal(ROLL_PRICE);
    expect(exitFeeBps).to.equal(EXIT_FEE_BPS);
  });

  it("should successfully execute a roll", async () => {
    const { slotMachineYieldGenerator } = await loadFixture(deployedContracts);
    const accounts = await ethers.getSigners();

    await slotMachineYieldGenerator.connect(accounts[0]).addRewardsLiquidity({ value: "1000000000000000000" });

    await slotMachineYieldGenerator
      .connect(accounts[1])
      .depositPlayerFunds(accounts[1].address, { value: "100000000000000000" });

    expect(await slotMachineYieldGenerator.connect(accounts[1]).executeRoll()).to.be.emit(
      slotMachineYieldGenerator,
      "Roll"
    );
  });

  it("should successfully deposit player funds", async () => {
    const { slotMachineYieldGenerator } = await loadFixture(deployedContracts);
    const accounts = await ethers.getSigners();

    await slotMachineYieldGenerator.connect(accounts[0]).addRewardsLiquidity({ value: "1000000000000000000" });

    expect(
      await slotMachineYieldGenerator
        .connect(accounts[1])
        .depositPlayerFunds(accounts[1].address, { value: "100000000000000000" })
    ).to.be.emit(slotMachineYieldGenerator, "DepositPlayerFunds");
  });

  it("should successfully withdraw player funds", async () => {
    const { slotMachineYieldGenerator } = await loadFixture(deployedContracts);
    const accounts = await ethers.getSigners();

    await slotMachineYieldGenerator.connect(accounts[0]).addRewardsLiquidity({ value: "1000000000000000000" });

    expect(
      await slotMachineYieldGenerator
        .connect(accounts[1])
        .depositPlayerFunds(accounts[1].address, { value: "100000000000000000" })
    ).to.be.emit(slotMachineYieldGenerator, "DepositPlayerFunds");

    expect(await slotMachineYieldGenerator.connect(accounts[1]).withdrawPlayerFunds("100000000000000000")).to.be.emit(
      slotMachineYieldGenerator,
      "WithdrawPlayerFunds"
    );
  });

  it("should successfully provide liquidity", async () => {
    const { slotMachineYieldGenerator } = await loadFixture(deployedContracts);
    const accounts = await ethers.getSigners();

    expect(
      await slotMachineYieldGenerator.connect(accounts[0]).addRewardsLiquidity({ value: "2000000000000000000" })
    ).to.be.emit(slotMachineYieldGenerator, "RewardsLiquidityAdded");
  });

  it("should NOT be able to provide liquidity above max cap", async () => {
    const { slotMachineYieldGenerator } = await loadFixture(deployedContracts);
    const accounts = await ethers.getSigners();

    await expect(
      slotMachineYieldGenerator.connect(accounts[0]).addRewardsLiquidity({ value: "100000000000000000001" })
    ).revertedWith("Slot Machine: Reward Pool Max Cap Exceeded");
  });

  it("should successfully mint LP Rewards Token after liquidity is provided", async () => {
    const { slotMachineYieldGenerator } = await loadFixture(deployedContracts);
    const accounts = await ethers.getSigners();

    expect(
      await slotMachineYieldGenerator.connect(accounts[0]).addRewardsLiquidity({ value: "2000000000000000000" })
    ).to.be.emit(slotMachineYieldGenerator, "RewardsLiquidityAdded");

    const lpTokenBalance = await slotMachineYieldGenerator.balanceOf(accounts[0].address);
    expect(lpTokenBalance).to.equal("1000000000000000000");
  });

  it("should successfully withdraw liquidity", async () => {
    const { slotMachineYieldGenerator } = await loadFixture(deployedContracts);
    const accounts = await ethers.getSigners();

    expect(
      await slotMachineYieldGenerator.connect(accounts[0]).addRewardsLiquidity({ value: "2000000000000000000" })
    ).to.be.emit(slotMachineYieldGenerator, "RewardsLiquidityAdded");

    expect(
      await slotMachineYieldGenerator.connect(accounts[0]).removeRewardsLiquidity("1000000000000000000")
    ).to.be.emit(slotMachineYieldGenerator, "RewardsLiquidityRemoved");

    const lpTokenBalance = await slotMachineYieldGenerator.balanceOf(accounts[0].address);
    expect(lpTokenBalance).to.equal("0");
  });

  it("should NOT be able to withdraw liquidity if you have not provided any", async () => {
    const { slotMachineYieldGenerator } = await loadFixture(deployedContracts);
    const accounts = await ethers.getSigners();

    expect(
      await slotMachineYieldGenerator.connect(accounts[0]).addRewardsLiquidity({ value: "2000000000000000000" })
    ).to.be.emit(slotMachineYieldGenerator, "RewardsLiquidityAdded");

    await expect(
      slotMachineYieldGenerator.connect(accounts[1]).removeRewardsLiquidity("1000000000000000000")
    ).revertedWith("ERC20: transfer amount exceeds balance");
  });

  it("should successfully deduct exit fee when withdrawing liquidity", async () => {
    const { slotMachineYieldGenerator } = await loadFixture(deployedContracts);
    const accounts = await ethers.getSigners();

    expect(
      await slotMachineYieldGenerator.connect(accounts[0]).addRewardsLiquidity({ value: "2000000000000000000" })
    ).to.be.emit(slotMachineYieldGenerator, "RewardsLiquidityAdded");

    expect(
      await slotMachineYieldGenerator.connect(accounts[0]).removeRewardsLiquidity("1000000000000000000")
    ).to.be.emit(slotMachineYieldGenerator, "RewardsLiquidityRemoved");

    const protocolRewardsBalance = await slotMachineYieldGenerator.protocolRewardsBalance();
    expect(protocolRewardsBalance).to.equal("100000000000000000");
  });

  it("Only owner should successfully withdraw protocol funds", async () => {
    const { slotMachineYieldGenerator } = await loadFixture(deployedContracts);
    const accounts = await ethers.getSigners();

    expect(
      await slotMachineYieldGenerator.connect(accounts[0]).addRewardsLiquidity({ value: "2000000000000000000" })
    ).to.be.emit(slotMachineYieldGenerator, "RewardsLiquidityAdded");

    expect(
      await slotMachineYieldGenerator.connect(accounts[0]).removeRewardsLiquidity("1000000000000000000")
    ).to.be.emit(slotMachineYieldGenerator, "RewardsLiquidityRemoved");

    await expect(slotMachineYieldGenerator.connect(accounts[1]).withdrawProtocolFees()).revertedWith(
      "Ownable: caller is not the owner"
    );
    await slotMachineYieldGenerator.connect(accounts[0]).withdrawProtocolFees();
  });

  it("Only owner should successfully update roll price", async () => {
    const { slotMachineYieldGenerator } = await loadFixture(deployedContracts);
    const accounts = await ethers.getSigners();

    await expect(slotMachineYieldGenerator.connect(accounts[1]).updateRollPrice("20000000000000000")).revertedWith(
      "Ownable: caller is not the owner"
    );

    expect(await slotMachineYieldGenerator.connect(accounts[0]).updateRollPrice("20000000000000000")).to.be.emit(
      slotMachineYieldGenerator,
      "RollPriceUpdated"
    );

    const newRollPrice = await slotMachineYieldGenerator.rollPrice();
    expect(newRollPrice).to.equal("20000000000000000");
  });

  it("Only owner should successfully update exit fee", async () => {
    const { slotMachineYieldGenerator } = await loadFixture(deployedContracts);
    const accounts = await ethers.getSigners();

    await expect(slotMachineYieldGenerator.connect(accounts[1]).updateExitFeeBps("1000")).revertedWith(
      "Ownable: caller is not the owner"
    );

    expect(await slotMachineYieldGenerator.connect(accounts[0]).updateExitFeeBps("1000")).to.be.emit(
      slotMachineYieldGenerator,
      "ExitFeeUpdated"
    );

    const newExitFeeBps = await slotMachineYieldGenerator.exitFeeBps();
    expect(newExitFeeBps).to.equal("1000");
  });

  it("Only owner should successfully update roll fee", async () => {
    const { slotMachineYieldGenerator } = await loadFixture(deployedContracts);
    const accounts = await ethers.getSigners();

    await expect(slotMachineYieldGenerator.connect(accounts[1]).updateRollFeeBps("1000")).revertedWith(
      "Ownable: caller is not the owner"
    );

    expect(await slotMachineYieldGenerator.connect(accounts[0]).updateRollFeeBps("1000")).to.be.emit(
      slotMachineYieldGenerator,
      "RollFeeUpdated"
    );

    const newRollFeeBps = await slotMachineYieldGenerator.rollFeeBps();
    expect(newRollFeeBps).to.equal("1000");
  });

  it("Only owner should successfully update reward pool max cap", async () => {
    const { slotMachineYieldGenerator } = await loadFixture(deployedContracts);
    const accounts = await ethers.getSigners();

    await expect(
      slotMachineYieldGenerator.connect(accounts[1]).updateRewardPoolMaxCap("1000000000000000000")
    ).revertedWith("Ownable: caller is not the owner");

    expect(
      await slotMachineYieldGenerator.connect(accounts[0]).updateRewardPoolMaxCap("2000000000000000000")
    ).to.be.emit(slotMachineYieldGenerator, "RewardPoolMaxCapUpdated");

    const newRewardPoolMaxCap = await slotMachineYieldGenerator.rewardPoolMaxCap();
    expect(newRewardPoolMaxCap).to.equal("2000000000000000000");
  });

  it("should NOT execute roll if there are not enough funds to pay the highest possible prize", async () => {
    const { slotMachineYieldGenerator } = await loadFixture(deployedContracts);
    const accounts = await ethers.getSigners();

    await slotMachineYieldGenerator
      .connect(accounts[1])
      .depositPlayerFunds(accounts[1].address, { value: "100000000000000000" });

    await expect(slotMachineYieldGenerator.connect(accounts[1]).executeRoll()).revertedWith(
      "Slot Machine: Not enough to pay max payout"
    );
  });

  it("should NOT be able to execute roll if the user has not enough funds", async () => {
    const { slotMachineYieldGenerator } = await loadFixture(deployedContracts);
    const accounts = await ethers.getSigners();

    await slotMachineYieldGenerator
      .connect(accounts[1])
      .depositPlayerFunds(accounts[1].address, { value: "1000000000000000" });

    await expect(slotMachineYieldGenerator.connect(accounts[1]).executeRoll()).revertedWith(
      "Slot Machine: Not enough funds"
    );
  });

  it("should NOT be able to able to execute a roll from a contract", async () => {
    const { slotMachineYieldGenerator, slotMachineExecutor } = await loadFixture(deployedContracts);
    const accounts = await ethers.getSigners();

    await slotMachineYieldGenerator
      .connect(accounts[0])
      .depositPlayerFunds(slotMachineExecutor.address, { value: "1000000000000000000" });

    expect(
      await slotMachineYieldGenerator.connect(accounts[1]).addRewardsLiquidity({ value: "2000000000000000000" })
    ).to.be.emit(slotMachineYieldGenerator, "RewardsLiquidityAdded");

    await expect(slotMachineExecutor.connect(accounts[2]).executeRollFromContract()).revertedWith(
      "Slot Machine: Caller cannot be a contract"
    );
  });

  it("should successfully update userBalance if roll is winning", async () => {
    const { slotMachineYieldGenerator, mockVRFCoordinator } = await loadFixture(deployedContracts);
    const accounts = await ethers.getSigners();

    await mockVRFCoordinator.setCombination(1);

    await slotMachineYieldGenerator.connect(accounts[0]).addRewardsLiquidity({ value: "1000000000000000000" });

    await slotMachineYieldGenerator
      .connect(accounts[1])
      .depositPlayerFunds(accounts[1].address, { value: "100000000000000000" });

    expect(await slotMachineYieldGenerator.connect(accounts[1]).executeRoll()).to.be.emit(
      slotMachineYieldGenerator,
      "Roll"
    );

    // Using address zero as recipient, because callback in mock is executed before requestId is returned.
    // TODO: Refactor Mock VRF Coordinator callback
    const userBalance = await slotMachineYieldGenerator.userBalance(ADDRESS_ZERO);
    expect(userBalance).to.equal("117600000000000000");
  });

  it("should successfully update reward pool balance if roll is lost", async () => {
    const { slotMachineYieldGenerator, mockVRFCoordinator } = await loadFixture(deployedContracts);
    const accounts = await ethers.getSigners();

    await mockVRFCoordinator.setCombination(0);

    await slotMachineYieldGenerator.connect(accounts[0]).addRewardsLiquidity({ value: "1000000000000000000" });

    await slotMachineYieldGenerator
      .connect(accounts[1])
      .depositPlayerFunds(accounts[1].address, { value: "100000000000000000" });

    expect(await slotMachineYieldGenerator.connect(accounts[1]).executeRoll()).to.be.emit(
      slotMachineYieldGenerator,
      "Roll"
    );

    const userBalance = await slotMachineYieldGenerator.userBalance(accounts[1].address);
    expect(userBalance).to.equal("90000000000000000");

    const rewardPoolBalance = await slotMachineYieldGenerator.rewardPoolBalance();
    expect(rewardPoolBalance).to.equal("1009800000000000000");
  });

  it("should calculate properly the total LP percentage of the pool when providing liquidity ", async () => {
    const { slotMachineYieldGenerator } = await loadFixture(deployedContracts);
    const accounts = await ethers.getSigners();

    expect(
      await slotMachineYieldGenerator.connect(accounts[0]).addRewardsLiquidity({ value: "2000000000000000000" })
    ).to.be.emit(slotMachineYieldGenerator, "RewardsLiquidityAdded");

    const lpTokenBalance1 = await slotMachineYieldGenerator.balanceOf(accounts[0].address);
    expect(lpTokenBalance1).to.equal("1000000000000000000");

    expect(
      await slotMachineYieldGenerator.connect(accounts[1]).addRewardsLiquidity({ value: "1000000000000000000" })
    ).to.be.emit(slotMachineYieldGenerator, "RewardsLiquidityAdded");

    const lpTokenBalance2 = await slotMachineYieldGenerator.balanceOf(accounts[1].address);
    expect(lpTokenBalance2).to.equal("500000000000000000");

    expect(
      await slotMachineYieldGenerator.connect(accounts[2]).addRewardsLiquidity({ value: "1000000000000000000" })
    ).to.be.emit(slotMachineYieldGenerator, "RewardsLiquidityAdded");

    const lpTokenBalance3 = await slotMachineYieldGenerator.balanceOf(accounts[2].address);
    expect(lpTokenBalance3).to.equal("500000000000000000");

    expect(
      await slotMachineYieldGenerator.connect(accounts[3]).addRewardsLiquidity({ value: "2000000000000000000" })
    ).to.be.emit(slotMachineYieldGenerator, "RewardsLiquidityAdded");

    const lpTokenBalance4 = await slotMachineYieldGenerator.balanceOf(accounts[3].address);
    expect(lpTokenBalance4).to.equal("1000000000000000000");
  });

  it("should successfully deduct roll fee on roll execution", async () => {
    const { slotMachineYieldGenerator, mockVRFCoordinator } = await loadFixture(deployedContracts);
    const accounts = await ethers.getSigners();

    await mockVRFCoordinator.setCombination(0);

    await slotMachineYieldGenerator.connect(accounts[0]).addRewardsLiquidity({ value: "1000000000000000000" });

    await slotMachineYieldGenerator
      .connect(accounts[1])
      .depositPlayerFunds(accounts[1].address, { value: "100000000000000000" });

    expect(await slotMachineYieldGenerator.connect(accounts[1]).executeRoll()).to.be.emit(
      slotMachineYieldGenerator,
      "Roll"
    );

    const userBalance = await slotMachineYieldGenerator.userBalance(accounts[1].address);
    expect(userBalance).to.equal("90000000000000000");

    const rewardPoolBalance = await slotMachineYieldGenerator.rewardPoolBalance();
    expect(rewardPoolBalance).to.equal("1009800000000000000");
  });
});
