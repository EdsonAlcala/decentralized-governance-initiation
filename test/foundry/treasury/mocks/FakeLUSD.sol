//SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract FakeLUSD is ERC20 {
  constructor(uint256 _amount) ERC20("Fake LUSD", " FakeLUSD") {
    _mint(msg.sender, _amount);
  }
}
