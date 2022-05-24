// SPDX-License-Identifier: MIT
// An example of a consumer contract that relies on a subscription for funding.
pragma solidity 0.8.14;

interface ISlotMachine {
    function depositFunds(address user) external payable;

    function withdrawFunds(uint256 amount) external;

    function executeRoll() external;
}
