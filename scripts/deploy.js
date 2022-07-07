const hre = require("hardhat");

async function main() {

  console.log("Starting deploy...");
  const SlotMachineYieldGenerator = await hre.ethers.getContractFactory("SlotMachineYieldGenerator");
  const slotMachineYieldGenerator = await SlotMachineYieldGenerator.deploy(
    process.env.ROLL_PRICE,
    process.env.EXIT_FEE_BPS,
    process.env.SUBSCRIPTION_ID,
    process.env.KEY_HASH,
    process.env.CALLBACK_GAS_LIMIT,
    process.env.VRF_REQUEST_CONFIRMATIONS,
    process.env.NUM_WORDS,
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
