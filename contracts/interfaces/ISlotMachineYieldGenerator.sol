// SPDX-License-Identifier: MIT
// An example of a consumer contract that relies on a subscription for funding.
pragma solidity 0.8.15;

interface ISlotMachineYieldGenerator {
    function depositFunds(address user) external payable;

    function withdrawFunds(uint256 amount) external;

    function executeRoll() external;

    function addLiquidity() external payable returns (uint256 liquidity);

    function removeLiquidity(uint256 liquidity)
        external
        returns (uint256 amount);
}
