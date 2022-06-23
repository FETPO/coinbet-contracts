const hre = require("hardhat");

async function main() {

  console.log("Starting deploy...");
  const SlotMachineYieldGenerator = await hre.ethers.getContractFactory("SlotMachineYieldGenerator");
  const slotMachineYieldGenerator = await SlotMachineYieldGenerator.deploy(
    process.env.ROLL_PRICE,
    process.env.PROTOCOL_FEE_BPS,
    process.env.EPOCH_SECONDS,
    process.env.EPOCH_STARTED_AT,
    process.env.EXIT_FEE_BPS,
    process.env.SUBSCRIPTION_ID,
    process.env.VRF_COORDINATOR
  );

  await slotMachineYieldGenerator.deployed();
  console.log(`Slot Machine deployed to: https://testnet.bscscan.com/address/${slotMachineYieldGenerator.address}`);

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
