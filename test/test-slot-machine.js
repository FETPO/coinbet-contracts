const { expect } = require("chai");

const { waffle, ethers, upgrades } = require("hardhat");
const { loadFixture } = waffle;

const ROLL_PRICE = "10000000000000000";
const PROTOCOL_FEE_BPS = "1000";
const EPOCH_SECONDS = "86400";
const EPOCH_STARTED_AT = "1656007200";
const EXIT_FEE_BPS = "1000";
const SUBSCRIPTION_ID = "0";

describe("Slot Machine Tests", () => {
  const deployedContracts = async () => {
    const MockVRFCoordinator = await hre.ethers.getContractFactory("MockVRFCoordinator");
    const mockVRFCoordinator = await MockVRFCoordinator.deploy();

    const SlotMachineYieldGenerator = await hre.ethers.getContractFactory("SlotMachineYieldGenerator");
    const slotMachineYieldGenerator = await SlotMachineYieldGenerator.deploy(
      ROLL_PRICE,
      PROTOCOL_FEE_BPS,
      EPOCH_SECONDS,
      EPOCH_STARTED_AT,
      EXIT_FEE_BPS,
      SUBSCRIPTION_ID,
      mockVRFCoordinator.address
    );

    await slotMachineYieldGenerator.deployed();

    return { slotMachineYieldGenerator, mockVRFCoordinator };
  };

  it("should successfully deploy Slot Machine and Reward Pool with correct configuration", async () => {
    const { slotMachineYieldGenerator, mockVRFCoordinator } = await loadFixture(deployedContracts);
    const accounts = await ethers.getSigners();

    const rollPrice = await slotMachineYieldGenerator.rollPrice();
    expect(rollPrice).to.equal(ROLL_PRICE);
  });

  it("should successfully execute a roll", async () => {
    const { slotMachineYieldGenerator, mockVRFCoordinator } = await loadFixture(deployedContracts);
    const accounts = await ethers.getSigners();

    await slotMachineYieldGenerator.connect(accounts[0]).addLiquidity({ value: "1000000000000000000" });

    await slotMachineYieldGenerator
      .connect(accounts[1])
      .depositFunds(accounts[1].address, { value: "100000000000000000" });

    await slotMachineYieldGenerator.connect(accounts[1]).executeRoll();
  });
});
