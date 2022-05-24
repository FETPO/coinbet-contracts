// SPDX-License-Identifier: MIT
// An example of a consumer contract that relies on a subscription for funding.
pragma solidity 0.8.14;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "./interfaces/IRewardPool.sol";
import "./interfaces/ISlotMachine.sol";
import "hardhat/console.sol";

contract RewardPool is IRewardPool, ReentrancyGuard, Ownable, Pausable, ERC20 {
    uint256 private _rewardsBalance;
    ISlotMachine public slotMachine;

    modifier onlySlotMachine() {
        require(
            _msgSender() == address(slotMachine),
            "Not called from the Slot Machine!"
        );
        _;
    }

    constructor() ERC20("Liquidity Provider Token", "LPT") {}

    function addLiquidity() external payable returns (uint256 liquidity) {
        uint256 _totalSupply = totalSupply();
        uint256 _reserve = _rewardsBalance;
        uint256 amount = msg.value;

        if (_totalSupply == 0) {
            liquidity = sqrt((((amount / 2) * (amount)) / 2));
        } else {
            liquidity = (amount * _totalSupply) / _reserve;
        }

        require(liquidity > 0, "INSUFFICIENT_LIQUIDITY_MINTED");
        _mint(_msgSender(), liquidity);
        _rewardsBalance += amount;
    }

    function removeLiquidity(uint256 liquidity)
        external
        returns (uint256 amount)
    {
        _transfer(_msgSender(), address(this), liquidity);
        uint256 balance = _rewardsBalance;
        uint256 _totalSupply = totalSupply();

        amount = (liquidity * balance) / _totalSupply;

        require(amount > 0, "INSUFFICIENT_LIQUIDITY_BURNED");

        _burn(address(this), liquidity);

        (bool success, ) = _msgSender().call{value: amount}("");
        require(success, "Withdrawal failed");
        _rewardsBalance -= amount;
    }

    function addFunds() external payable onlySlotMachine {
        _rewardsBalance += msg.value;
    }

    function awardWinner(uint256 amount, address winner)
        external
        onlySlotMachine
    {
        _rewardsBalance -= amount;
        slotMachine.depositFunds{value: amount}(winner);
    }

    function setSlotMachine(address _slotMachine) external onlyOwner {
        slotMachine = ISlotMachine(_slotMachine);
    }

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

    function rewardsBalance() external view returns (uint256) {
        return _rewardsBalance;
    }
}
