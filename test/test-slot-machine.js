const { expect } = require("chai");

const { waffle, ethers, upgrades } = require("hardhat");
const { loadFixture } = waffle;

const ROLL_PRICE = "10000000000000000";
const SUBSCRIPTION_ID = "0"

describe("Slot Machine Tests", () => {
  const deployedContracts = async () => {

    const MockVRFCoordinator = await hre.ethers.getContractFactory("MockVRFCoordinator");
    const mockVRFCoordinator = await MockVRFCoordinator.deploy();

    const RewardPool = await hre.ethers.getContractFactory("RewardPool");
    const rewardPool = await RewardPool.deploy();
    await rewardPool.deployed();

    const SlotMachine = await hre.ethers.getContractFactory("SlotMachine");
    const slotMachine = await SlotMachine.deploy(ROLL_PRICE, rewardPool.address, SUBSCRIPTION_ID, mockVRFCoordinator.address);
  
    await slotMachine.deployed();

    await rewardPool.setSlotMachine(slotMachine.address);


    return { rewardPool, slotMachine, mockVRFCoordinator };
  };

  it("should successfully deploy Slot Machine and Reward Pool with correct configuration", async () => {
    const { rewardPool, slotMachine, mockVRFCoordinator } = await loadFixture(
      deployedContracts
    );
    const accounts = await ethers.getSigners();

    const slotMachineAddress = await rewardPool.slotMachine();
    const rewardPoolAddress = await slotMachine.rewardPool();
    const rollPrice = await slotMachine.rollPrice();

    expect(slotMachineAddress).to.equal(slotMachine.address);
    expect(rewardPoolAddress).to.equal(rewardPool.address);
    expect(rollPrice).to.equal(ROLL_PRICE);

  });

  it("should successfully execute a roll", async () => {
    const { rewardPool, slotMachine, mockVRFCoordinator } = await loadFixture(
      deployedContracts
    );
    const accounts = await ethers.getSigners();

    await rewardPool.connect(accounts[0]).addLiquidity({value: "1000000000000000000"});

    await slotMachine.connect(accounts[1]).depositFunds(accounts[1].address, {value: "100000000000000000"});

    await slotMachine.connect(accounts[1]).executeRoll();



  });

//   it("should not transfer more than 50 in one call", async () => {
//     const { universeMarketplace, mockNFT, mockNFT2 } = await loadFixture(
//       deployedContracts
//     );
//     const accounts = await ethers.getSigners();

//     const nftsToTransfer = [];

//     for (let i = 0; i < 25; i++) {
//       await mockNFT.connect(accounts[0]).mint("https://universe.xyz");
//       await mockNFT.connect(accounts[0]).approve(universeMarketplace.address, i + 1);
//       nftsToTransfer.push([mockNFT.address, i + 1]);
//     }

//     for (let i = 0; i < 30; i++) {
//       await mockNFT2.connect(accounts[0]).mint("https://universe.xyz");
//       await mockNFT2.connect(accounts[0]).approve(universeMarketplace.address, i + 1);
//       nftsToTransfer.push([mockNFT2.address, i + 1]);
//     }

//     await expect(
//       universeMarketplace.erc721BatchTransfer(nftsToTransfer, accounts[1].address)
//     ).to.be.revertedWith("Cannot transfer more than configured");
//   });

//   it("should not transfer NFTs is caller is not owner", async () => {
//     const { universeMarketplace, mockNFT, mockNFT2 } = await loadFixture(
//       deployedContracts
//     );
//     const accounts = await ethers.getSigners();

//     const nftsToTransfer = [];

//     for (let i = 0; i < 5; i++) {
//       await mockNFT.connect(accounts[1]).mint("https://universe.xyz");
//       await mockNFT.connect(accounts[1]).approve(universeMarketplace.address, i + 1);
//       nftsToTransfer.push([mockNFT.address, i + 1]);
//     }

//     for (let i = 0; i < 5; i++) {
//       await mockNFT2.connect(accounts[1]).mint("https://universe.xyz");
//       await mockNFT2.connect(accounts[1]).approve(universeMarketplace.address, i + 1);
//       nftsToTransfer.push([mockNFT2.address, i + 1]);
//     }

//     await expect(
//       universeMarketplace.erc721BatchTransfer(nftsToTransfer, accounts[2].address)
//     ).to.be.revertedWith("ERC721: transfer of token that is not own");
//   });
});