// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.17;

/**
 * @title MockVerifier
 * @dev A simple mock verifier that always returns true for testing
 * Implements the same interface as real ZK proof verifier contracts
 */
contract MockVerifier {
    /**
     * @dev Always returns true for any proof
     * This allows testing contract functionality without generating real ZK proofs
     */
    function verifyProof(
        uint[2] memory a,
        uint[2][2] memory b,
        uint[2] memory c,
        uint[] memory input
    ) external pure returns (bool) {
        // Mock implementation - always returns true
        // In a real circuit, this would validate the proof
        return true;
    }
} 