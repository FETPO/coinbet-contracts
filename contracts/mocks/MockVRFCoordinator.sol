//SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";

contract MockVRFCoordinator {
    uint256 internal counter = 0;

    function requestRandomWords(
        bytes32,
        uint64,
        uint16,
        uint32,
        uint32
    ) external returns (uint256 requestId) {
        VRFConsumerBaseV2 consumer = VRFConsumerBaseV2(msg.sender);
        uint256[] memory randomWords = new uint256[](3);
        randomWords[0] = uint256(keccak256(abi.encode(block.difficulty, block.timestamp, counter)));
        randomWords[1] = uint256(keccak256(abi.encode(block.difficulty, block.timestamp, counter + 1)));
        randomWords[2] = uint256(keccak256(abi.encode(block.difficulty, block.timestamp, counter + 2)));
        consumer.rawFulfillRandomWords(requestId, randomWords);
        counter += 1;
    }
}