pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/pedersen.circom";
include "../node_modules/circomlib/circuits/bitify.circom";

template PedersenOutput1() {
    // Private inputs
    signal input amount_out1;
    signal input owner_out1; 
    signal input salt_out1;
    
    // Public outputs
    signal output hash_x;
    signal output hash_y;
    
    // Convert inputs to bits
    component amount_bits = Num2Bits(64);
    component owner_bits = Num2Bits(64);
    component salt_bits = Num2Bits(64);
    
    amount_bits.in <== amount_out1;
    owner_bits.in <== owner_out1;
    salt_bits.in <== salt_out1;
    
    // Create Pedersen hash component
    component pedersenHash = Pedersen(192);
    
    // Connect input bits to Pedersen hash
    for (var i = 0; i < 64; i++) {
        pedersenHash.in[i] <== amount_bits.out[i];
        pedersenHash.in[64 + i] <== owner_bits.out[i];
        pedersenHash.in[128 + i] <== salt_bits.out[i];
    }
    
    // Output hash
    hash_x <== pedersenHash.out[0];
    hash_y <== pedersenHash.out[1];
}

component main = PedersenOutput1(); 