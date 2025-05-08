pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/bitify.circom";

/*
 * Vote commitment circuit - used during the commit phase
 * Verifies that the commitment contains a valid choice, reveal address and salt
 */
template VoteCommitmentCircuit() {
    // Private inputs
    signal input choice;      // The vote choice
    signal input revealAddress; // Address that will be used to reveal (hidden)
    signal input salt;        // A random salt
    signal input ballotId;    // The ballot ID
    
    // Public inputs
    signal input commitment;  // The Poseidon hash of (choice, revealAddress, salt, ballotId)
    
    // Verify the choice is valid (between 0 and 4 for example)
    component choiceRange = LessThan(8);
    choiceRange.in[0] <== choice;
    choiceRange.in[1] <== 5; // Max choices + 1
    choiceRange.out === 1;
    
    // Compute the commitment using Poseidon hash
    component commitmentHasher = Poseidon(4);
    commitmentHasher.inputs[0] <== choice;
    commitmentHasher.inputs[1] <== revealAddress;
    commitmentHasher.inputs[2] <== salt;
    commitmentHasher.inputs[3] <== ballotId;
    
    // Log values for debugging
    // log("Choice:", choice);
    // log("Reveal Address:", revealAddress);
    // log("Salt:", salt);
    // log("Ballot ID:", ballotId);
    // log("Computed commitment:", commitmentHasher.out);
    // log("Expected commitment:", commitment);
    
    // Verify the commitment matches
    commitment === commitmentHasher.out;
}

// Main component for commitment
component main {public [commitment]} = VoteCommitmentCircuit(); 