// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SimpleStorage {
    uint256 private number;
    
    // Function to store a number
    function store(uint256 num) public {
        number = num;
    }
    
    // Function to retrieve the stored number
    function retrieve() public view returns (uint256) {
        return number;
    }
}
