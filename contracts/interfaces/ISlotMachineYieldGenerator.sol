// SPDX-License-Identifier: MIT
// An example of a consumer contract that relies on a subscription for funding.
pragma solidity 0.8.17;

interface ISlotMachineYieldGenerator {
    function depositPlayerFunds(address user) external payable;

    function withdrawPlayerFunds(uint256 amount) external;

    function executeRoll() external;

    function addRewardsLiquidity() external payable returns (uint256 liquidity);

    function removeRewardsLiquidity(uint256 liquidity)
        external
        returns (uint256 amount);
}
