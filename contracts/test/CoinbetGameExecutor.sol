// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "../interfaces/ICoinbetGame.sol";

contract CoinbetGameExecutor {
    ICoinbetGame coinbetGame;

    constructor(address coinbetGameAddress) {
        coinbetGame = ICoinbetGame(coinbetGameAddress);
    }

    function executeGameFromContract() public payable {
        coinbetGame.coinbet();
    }
}
