// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title SecurityProxy
 * @dev Acts as a proxy to prevent interactions with high-risk contracts
 */
contract SecurityProxy {
    address public immutable targetContract;
    address public admin;
    bool public frozen = true;
    
    // Events
    event CallBlocked(address indexed sender, bytes4 indexed selector, bytes data);
    event StatusChanged(bool frozen);
    event AdminChanged(address indexed newAdmin);
    
    // Modifiers
    modifier onlyAdmin() {
        require(msg.sender == admin, "SecurityProxy: caller is not the admin");
        _;
    }
    
    constructor(address _targetContract) {
        require(_targetContract != address(0), "SecurityProxy: invalid target address");
        targetContract = _targetContract;
        admin = msg.sender;
    }
    
    /**
     * @dev Changes the frozen status of the proxy
     * @param _frozen New status
     */
    function setFrozen(bool _frozen) external onlyAdmin {
        frozen = _frozen;
        emit StatusChanged(_frozen);
    }
    
    /**
     * @dev Changes the admin of the proxy
     * @param _newAdmin Address of the new admin
     */
    function changeAdmin(address _newAdmin) external onlyAdmin {
        require(_newAdmin != address(0), "SecurityProxy: invalid admin address");
        admin = _newAdmin;
        emit AdminChanged(_newAdmin);
    }
    
    /**
     * @dev Fallback function that blocks all calls to the target contract when frozen
     */
    fallback() external payable {
        if (frozen) {
            emit CallBlocked(msg.sender, msg.sig, msg.data);
            revert("SecurityProxy: contract is frozen due to security risk");
        }
        
        // If not frozen (emergency mode), forward the call to the target
        (bool success, bytes memory data) = targetContract.call{value: msg.value}(msg.data);
        if (!success) {
            assembly {
                revert(add(data, 32), mload(data))
            }
        }
        
        assembly {
            return(add(data, 32), mload(data))
        }
    }
    
    /**
     * @dev Receive function to handle plain Ether transfers
     */
    receive() external payable {
        if (frozen) {
            emit CallBlocked(msg.sender, bytes4(0), "");
            revert("SecurityProxy: contract is frozen due to security risk");
        }
        
        (bool success, ) = targetContract.call{value: msg.value}("");
        require(success, "SecurityProxy: ETH transfer failed");
    }
}