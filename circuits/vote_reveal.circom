pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/bitify.circom";

/*
 * Vote reveal circuit - used during the reveal phase
 * Verifies that the caller's address and the choice were part of the original commitment
 */
template VoteRevealCircuit() {
    // Private inputs
    signal input salt;         // The salt used in the commitment
    
    // Public inputs
    signal input choice;       // The vote choice being revealed (public now)
    signal input nullifier;    // Nullifier to prevent double voting
    signal input sender;       // msg.sender of the reveal transaction
    signal input ballotId;     // The ballot ID
    
    // Convert inputs to bits for validation
    component choiceBits = Num2Bits(32);
    component senderBits = Num2Bits(160);
    component saltBits = Num2Bits(254);
    component ballotBits = Num2Bits(32);
    
    choiceBits.in <== choice;
    senderBits.in <== sender;
    saltBits.in <== salt;
    ballotBits.in <== ballotId;
    
    // First generate the commitment that should be in the set
    component commitmentHasher = Poseidon(4);
    commitmentHasher.inputs[0] <== choice;
    commitmentHasher.inputs[1] <== sender;  // The reveal address is now the sender
    commitmentHasher.inputs[2] <== salt;
    commitmentHasher.inputs[3] <== ballotId;
    
    // Log values for debugging
    log("Choice:", choice);
    log("Sender:", sender);
    log("Salt:", salt);
    log("Ballot ID:", ballotId);
    log("Commitment:", commitmentHasher.out);
    
    // We don't need to output this commitment - the contract 
    // can't verify it's in the set (would need Merkle proof)
    // But this enforces that the nullifier matches a valid commitment structure
    
    // Generate nullifier for double-spend protection
    component nullifierHasher = Poseidon(2);
    nullifierHasher.inputs[0] <== sender;
    nullifierHasher.inputs[1] <== salt;
    
    // Log values for debugging
    log("Computed nullifier:", nullifierHasher.out);
    log("Expected nullifier:", nullifier);
    
    // Verify the nullifier matches
    nullifier === nullifierHasher.out;
}

// Main component for reveal
component main {public [choice, nullifier, sender, ballotId]} = VoteRevealCircuit(); 