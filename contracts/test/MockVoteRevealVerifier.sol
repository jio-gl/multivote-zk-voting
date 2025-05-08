// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.17;

/**
 * @title MockVoteRevealVerifier
 * @dev Mock verifier for vote reveal proofs in tests
 */
contract MockVoteRevealVerifier {
    /**
     * @dev Always returns true for testing purposes
     */
    function verifyProof(
        uint[2] memory a,
        uint[2][2] memory b,
        uint[2] memory c,
        uint[4] memory input
    ) public pure returns (bool) {
        // Always return true for testing
        return true;
    }
} 