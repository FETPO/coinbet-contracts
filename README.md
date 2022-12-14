<div align="center">

# Slot machine with yield generation, powered by ChainLink

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

## Overview

The repository contains contracts for a slot machine game, powered by Chainlink's VRF. On one side, users who want to generate yield
can provide liquidity for paying rewards to players. Liquidity providers are also entitled to the profits of the slots, as they serve the role of
the house. On the other side, players can execute rolls as long as they have enough balance and also withdraw their winnings at any time.

## Contract Addresses

Coinbet Token ($CFI) - https://polygonscan.com/token/0xc71A7e46266A9a78212a5d87b030F8D1Ce942Efd
Coinbet House Pool - https://polygonscan.com/address/0x23D0C8628409532cfEACf9F397fDe0352224B4Af
Coinbet Slot Machine - https://polygonscan.com/address/0xF8698158fF36fAc2F834bDc18203836D28eD6B3c

### Installation

```console
$ yarn
```

### Compile

```console
$ yarn compile
```

This task will compile all smart contracts in the `contracts` directory.
ABI files will be automatically exported in `artifacts` directory.

### Testing

```console
$ yarn test
```

### Code coverage

```console
$ yarn coverage
```

The report will be printed in the console and a static website containing full report will be generated in `coverage` directory.

### Code style

```console
$ yarn prettier
```

### Verify & Publish contract source code

```console
$ npx hardhat  verify --network mainnet $CONTRACT_ADDRESS $CONSTRUCTOR_ARGUMENTS
```
