pragma solidity ^0.8.0;

contract Voting {
    mapping(string => uint256) public votesReceived;
    string[] public candidateList;

    constructor(string[] memory candidates) {
        candidateList = candidates;
    }

    function vote(string memory candidate) public {
        require(isValidCandidate(candidate), "Not a valid candidate");
        votesReceived[candidate] += 1;
    }

    function totalVotesFor(string memory candidate) public view returns (uint256) {
        require(isValidCandidate(candidate), "Not a valid candidate");
        return votesReceived[candidate];
    }

    function isValidCandidate(string memory candidate) private view returns (bool) {
        for (uint i = 0; i < candidateList.length; i++) {
            if (keccak256(bytes(candidateList[i])) == keccak256(bytes(candidate))) {
                return true;
            }
        }
        return false;
    }
}
