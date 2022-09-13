//SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";

contract MockVRFCoordinator {
    enum Combination {
        LOSING,
        WINNING
    }

    Combination currentCombination = Combination.LOSING;
    uint256 internal counter = 1;

    function setCombination(uint256 value) public {
        currentCombination = Combination(value);
    }

    function requestRandomWords(
        bytes32,
        uint64,
        uint16,
        uint32,
        uint32
    ) external returns (uint256 requestId) {
        VRFConsumerBaseV2 consumer = VRFConsumerBaseV2(msg.sender);
        uint256[] memory randomWords = new uint256[](3);
        if (currentCombination == Combination.LOSING) {
            randomWords[0] = 1;
            randomWords[1] = 2;
            randomWords[2] = 3;
        } else if (currentCombination == Combination.WINNING) {
            randomWords[0] = 2;
            randomWords[1] = 2;
            randomWords[2] = 2;
        }
        counter += 1;
        requestId = uint256(
            keccak256(abi.encode(block.difficulty, block.timestamp, counter))
        );
        consumer.rawFulfillRandomWords(requestId, randomWords);
    }
}