// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ActivityValidator {
    event ActivityValidated(address indexed user, bytes32 proofHash, uint256 distance, uint256 steps, uint256 duration);

    function validateActivity(bytes32 proofHash, uint256 distance, uint256 steps, uint256 duration)
        external
        returns (bool)
    {
        // Add your validation logic here
        // For example, check if the distance/steps ratio is realistic
        require(steps >= distance * 1.2, "Invalid steps to distance ratio");

        emit ActivityValidated(msg.sender, proofHash, distance, steps, duration);
        return true;
    }
}
