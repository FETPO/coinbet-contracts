const hre = require("hardhat");

async function main() {
  console.log("Starting deploy Coinbet Finance $CFI Token...");

  const CoinbetToken = await hre.ethers.getContractFactory("CoinbetToken");
  const coinbetToken = await CoinbetToken.deploy();

  await coinbetToken.deployed();

  console.log(
    `Coinbet Token deployed to: https://mumbai.polygonscan.com/address/${coinbetToken.address}`
  );

  console.log("Starting deploy Coinbet House Pool...");

  const CoinbetHousePool = await hre.ethers.getContractFactory(
    "CoinbetHousePool"
  );
  const coinbetHousePool = await CoinbetHousePool.deploy(
    process.env.EXIT_FEE_BPS,
    process.env.POOL_MAX_CAP,
    process.env.EPOCH_SECONDS,
    process.env.EPOCH_STARTED_AT,
    process.env.COINBET_TOKEN_FEE_WAIVER_TRESHOLD_HOUSE,
    process.env.WITHDRAW_WINDOW_SECONDS,
    process.env.COINBET_TOKEN_REWARD_MULTIPLIER,
    process.env.FINALIZE_EPOCH_BONUS,
    process.env.MAX_BET_TO_POOL_RATIO,
    process.env.COINBET_TOKEN_ADDRESS,
    process.env.INCENTIVE_MODE
  );

  await coinbetHousePool.deployed();

  console.log(
    `Coinbet House Pool deployed to: https://mumbai.polygonscan.com/address/${coinbetHousePool.address}`
  );

  console.log("Starting deploy Coinbet Game...");

  const CoinbetSlotMachine = await hre.ethers.getContractFactory(
    "CoinbetSlotMachine"
  );
  const coinbetSlotMachine = await CoinbetSlotMachine.deploy(
    process.env.MIN_BET_AMOUNT,
    process.env.MAX_BET_AMOUNT,
    process.env.COINBET_TOKEN_FEE_WAIVER_TRESHOLD_GAME,
    process.env.PROTOCOL_FEE_BPS,
    process.env.SUBSCRIPTION_ID,
    process.env.KEY_HASH,
    process.env.CALLBACK_GAS_LIMIT,
    process.env.VRF_REQUEST_CONFIRMATIONS,
    process.env.NUM_WORDS,
    process.env.VRF_COORDINATOR,
    process.env.COINBET_HOUSE_POOL_ADDRESS,
    process.env.COINBET_TOKEN_ADDRESS
  );

  await coinbetSlotMachine.deployed();

  console.log(
    `Coinbet Slot Machine deployed to: https://mumbai.polygonscan.com/address/${coinbetSlotMachine.address}`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
