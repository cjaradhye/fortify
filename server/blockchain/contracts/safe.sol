// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract SafeVault {
    mapping(address => uint256) public balances;

    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);

    // Deposit ETH into the contract
    function deposit() external payable {
        require(msg.value > 0, "Must send ETH");
        balances[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }

    // Withdraw ETH safely (pull pattern)
    function withdraw(uint256 amount) external {
        require(amount > 0, "Zero withdraw");
        require(balances[msg.sender] >= amount, "Not enough balance");

        balances[msg.sender] -= amount;

        // Safe transfer with call
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Withdraw failed");

        emit Withdraw(msg.sender, amount);
    }

    // View contract balance
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
