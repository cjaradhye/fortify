{{
  "language": "Solidity",
  "sources": {
    "contracts/simpleStorage.sol": {
      "content": "// SPDX-License-Identifier: MIT\r\npragma solidity ^0.8.0;\r\n\r\ncontract SimpleStorage {\r\n    uint256 private number;\r\n    \r\n    // Function to store a number\r\n    function store(uint256 num) public {\r\n        number = num;\r\n    }\r\n    \r\n    // Function to retrieve the stored number\r\n    function retrieve() public view returns (uint256) {\r\n        return number;\r\n    }\r\n}\r\n"
    }
  },
  "settings": {
    "evmVersion": "paris",
    "optimizer": {
      "enabled": false,
      "runs": 200
    },
    "outputSelection": {
      "*": {
        "*": [
          "evm.bytecode",
          "evm.deployedBytecode",
          "devdoc",
          "userdoc",
          "metadata",
          "abi"
        ]
      }
    },
    "libraries": {}
  }
}}