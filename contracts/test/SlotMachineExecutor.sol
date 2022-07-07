// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

import "../interfaces/ISlotMachineYieldGenerator.sol";

contract SlotMachineExecutor {
    ISlotMachineYieldGenerator slotMachine;

    constructor(address slotMachineYieldGeneratorAddress) {
        slotMachine = ISlotMachineYieldGenerator(
            slotMachineYieldGeneratorAddress
        );
    }

    function executeRollFromContract() public {
        slotMachine.executeRoll();
    }
}
