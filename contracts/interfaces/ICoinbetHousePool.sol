// SPDX-License-Identifier: MIT
// An example of a consumer contract that relies on a subscription for funding.
pragma solidity 0.8.17;

interface ICoinbetHousePool {
    function addRewardsLiquidity() external payable returns (uint256 liquidity);

    function poolBalance() external returns (uint256);

    function availableFundsForPayroll() external returns (uint256);

    function placeBet(
        uint256 protocolFee,
        address player,
        uint256 maxWinnableAmount
    ) external payable;

    function settleBet(
        uint256 winAmount,
        address player,
        uint256 maxWinnableAmount
    ) external;

    function removeRewardsLiquidity(uint256 liquidity)
        external
        returns (uint256 amount);
}
