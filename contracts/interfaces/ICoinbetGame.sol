// SPDX-License-Identifier: MIT
// An example of a consumer contract that relies on a subscription for funding.
pragma solidity 0.8.17;

interface ICoinbetGame{
    function coinbet() external payable;
}
