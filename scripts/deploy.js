const hre = require("hardhat");

async function main() {
  console.log("Starting deploy...");
  const RewardPool = await hre.ethers.getContractFactory("RewardPool");
  const rewardPool = await RewardPool.deploy();

  await rewardPool.deployed();
  console.log(`Reward Pool deployed to: https://testnet.bscscan.com/address/${rewardPool.address}`);

  console.log("Starting deploy...");
  const SlotMachine = await hre.ethers.getContractFactory("SlotMachine");
  const slotMachine = await SlotMachine.deploy(
    process.env.ROLL_PRICE,
    rewardPool.address,
    process.env.SUBSCRIPTION_ID,
    process.env.VRF_COORDINATOR
  );

  await slotMachine.deployed();
  console.log(`Slot Machine deployed to: https://testnet.bscscan.com/address/${slotMachine.address}`);

  await rewardPool.setSlotMachine(slotMachine.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
