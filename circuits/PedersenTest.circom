pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/pedersen.circom";
include "../node_modules/circomlib/circuits/bitify.circom";

template PedersenTest() {
    // Private inputs
    signal input amount_in;
    signal input owner_in; 
    signal input salt_in;
    
    // Expected output (for debugging)
    signal input expected_hash[2];
    
    // Convert inputs to bits
    component amount_bits = Num2Bits(64);
    component owner_bits = Num2Bits(64);
    component salt_bits = Num2Bits(64);
    
    amount_bits.in <== amount_in;
    owner_bits.in <== owner_in;
    salt_bits.in <== salt_in;
    
    // Debug signals
    signal amount_bits_out[64];
    signal owner_bits_out[64];
    signal salt_bits_out[64];
    
    for (var i = 0; i < 64; i++) {
        amount_bits_out[i] <== amount_bits.out[i];
        owner_bits_out[i] <== owner_bits.out[i];
        salt_bits_out[i] <== salt_bits.out[i];
    }
    
    // Create Pedersen hash component
    component pedersenHash = Pedersen(192);
    
    // Combine all input bits for the Pedersen hash
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
    
    // Check if the hash matches the expected output
    // Uncomment to enforce this check
    // hash_out[0] === expected_hash[0];
    // hash_out[1] === expected_hash[1];
}

component main = PedersenTest(); 