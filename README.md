<div align="center">

# Blockchain betting protocol with liquidity providing house pools for generating yield, powered by Chainlink

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

## Overview

The repository contains contracts for yield generating betting games, powered by Chainlink's VRF. On one side, users who want to generate yield
can provide liquidity for paying rewards to players. Liquidity providers are also entitled to the profits of the games, as they serve the role of
the house. On the other side, players can play as long as they have enough balance and there is enough liqudity in the house pools.

## Contract Addresses

Coinbet Token ($CFI) - https://polygonscan.com/token/0xc71A7e46266A9a78212a5d87b030F8D1Ce942Ef <br>
Coinbet House Pool - https://polygonscan.com/address/0x73934EE106E2546705f0fdd10b69c356D09ac19d <br>
Coinbet Slot Machine - https://polygonscan.com/address/0x52A396c999d70c3Ccb2949F77DEE482165A428D7 <br>

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
