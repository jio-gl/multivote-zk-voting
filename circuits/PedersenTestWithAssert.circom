pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/pedersen.circom";
include "../node_modules/circomlib/circuits/bitify.circom";

template PedersenTestWithAssert() {
    // Private inputs
    signal input amount_in;
    signal input owner_in; 
    signal input salt_in;
    
    // Expected output (now required to match)
    signal input expected_hash[2];
    
    // Convert inputs to bits
    component amount_bits = Num2Bits(64);
    component owner_bits = Num2Bits(64);
    component salt_bits = Num2Bits(64);
    
    amount_bits.in <== amount_in;
    owner_bits.in <== owner_in;
    salt_bits.in <== salt_in;
    
    // Create Pedersen hash component
    component pedersenHash = Pedersen(192);
    
    // Connect input bits to Pedersen hash
    for (var i = 0; i < 64; i++) {
        pedersenHash.in[i] <== amount_bits.out[i];
        pedersenHash.in[64 + i] <== owner_bits.out[i];
        pedersenHash.in[128 + i] <== salt_bits.out[i];
    }
    
    // Output hash
    signal hash_out[2];
    hash_out[0] <== pedersenHash.out[0];
    hash_out[1] <== pedersenHash.out[1];
    
    // For debugging - difference between calculated and expected
    signal diff_x;
    signal diff_y;
    diff_x <== hash_out[0] - expected_hash[0];
    diff_y <== hash_out[1] - expected_hash[1];
    
    // Log values for debugging
    // log("Amount bits:", amount_bits.out[0], amount_bits.out[1], amount_bits.out[2], amount_bits.out[3]);
    // log("Owner bits:", owner_bits.out[0], owner_bits.out[1], owner_bits.out[2], owner_bits.out[3]);
    // log("Salt bits:", salt_bits.out[0], salt_bits.out[1], salt_bits.out[2], salt_bits.out[3]);
    // log("Hash out X:", hash_out[0]);
    // log("Hash out Y:", hash_out[1]);
    // log("Expected X:", expected_hash[0]);
    // log("Expected Y:", expected_hash[1]);
    // log("Diff X:", diff_x);
    // log("Diff Y:", diff_y);
    
    // Assert that the hash matches the expected value
    hash_out[0] === expected_hash[0];
    hash_out[1] === expected_hash[1];
}

component main = PedersenTestWithAssert(); 