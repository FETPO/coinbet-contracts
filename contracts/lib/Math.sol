// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

library Math {
    function sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }

    function calculateReward(
        uint256 rollPrice,
        uint256 firstRandom,
        uint256 secondRandom,
        uint256 thirdRandom
    ) internal pure returns (uint256) {
        if (firstRandom == 6 && secondRandom == 6 && thirdRandom == 6) {
            return rollPrice * 30;
        } else if (firstRandom == 5 && secondRandom == 5 && thirdRandom == 5) {
            return rollPrice * 20;
        } else if (firstRandom == 4 && secondRandom == 4 && thirdRandom == 4) {
            return rollPrice * 15;
        } else if (firstRandom == 3 && secondRandom == 3 && thirdRandom == 3) {
            return rollPrice * 12;
        } else if (firstRandom == 2 && secondRandom == 2 && thirdRandom == 2) {
            return rollPrice * 10;
        } else if (firstRandom == 1 && secondRandom == 1 && thirdRandom == 1) {
            return rollPrice * 5;
        } else if (
            (firstRandom == secondRandom) ||
            (firstRandom == thirdRandom) ||
            (secondRandom == thirdRandom)
        ) {
            return rollPrice;
        } else {
            return 0;
        }
    }
}
