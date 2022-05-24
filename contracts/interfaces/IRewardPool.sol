// SPDX-License-Identifier: MIT
// An example of a consumer contract that relies on a subscription for funding.
pragma solidity 0.8.14;

interface IRewardPool {
    function addLiquidity() external payable returns (uint256 liquidity);

    function removeLiquidity(uint256 liquidity)
        external
        returns (uint256 amount);

    function addFunds() external payable;

    function awardWinner(uint256 amount, address winner) external;

    function rewardsBalance() external view returns (uint256);
}
