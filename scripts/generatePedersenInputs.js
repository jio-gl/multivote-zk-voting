#!/usr/bin/env node

/**
 * This script generates inputs for the Pedersen test circuits.
 * It calculates the proper hash values for test inputs.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log("Generating Pedersen test inputs...");

// Function to calculate Pedersen hash using a temporary circuit
function calculatePedersenHash(amount, owner, salt) {
  // Create temporary circuit to calculate hash
  const tempDir = path.join(__dirname, '../temp');
  
  // Create temp directory if it doesn't exist
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  // Generate circuit
  const circuitCode = `
pragma circom 2.0.0;
include "../node_modules/circomlib/circuits/pedersen.circom";
include "../node_modules/circomlib/circuits/bitify.circom";

template PedersenOutputCalc() {
    // Private inputs
    signal input amount_in;
    signal input owner_in; 
    signal input salt_in;
    
    // Public outputs
    signal output hash_x;
    signal output hash_y;
    
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
    hash_x <== pedersenHash.out[0];
    hash_y <== pedersenHash.out[1];
}

component main = PedersenOutputCalc();
`;
  
  const inputData = {
    amount_in: amount,
    owner_in: owner,
    salt_in: salt
  };
  
  const circuitPath = path.join(tempDir, 'PedersenOutputCalc.circom');
  const inputPath = path.join(tempDir, 'PedersenOutputCalc_input.json');
  const witnessPath = path.join(tempDir, 'PedersenOutputCalc_witness.wtns');
  const jsonPath = path.join(tempDir, 'PedersenOutputCalc_witness.json');
  
  // Write the circuit to a temporary file
  console.log('Creating PedersenOutputCalc circuit...');
  fs.writeFileSync(circuitPath, circuitCode);
  
  // Write the input values to a temporary file
  console.log('Creating PedersenOutputCalc input...');
  fs.writeFileSync(inputPath, JSON.stringify(inputData, null, 2));
  
  // Compile the circuit
  console.log('Compiling PedersenOutputCalc circuit...');
  execSync(`cd ${tempDir} && circom PedersenOutputCalc.circom --r1cs --wasm -o ${tempDir}`, {stdio: 'inherit'});
  
  // Generate the witness
  console.log('Generating PedersenOutputCalc witness...');
  execSync(`cd ${tempDir} && node PedersenOutputCalc_js/generate_witness.js PedersenOutputCalc_js/PedersenOutputCalc.wasm PedersenOutputCalc_input.json PedersenOutputCalc_witness.wtns`, {stdio: 'inherit'});
  
  // Export the witness to JSON
  console.log('Exporting PedersenOutputCalc witness to JSON...');
  execSync(`cd ${tempDir} && snarkjs wtns export json PedersenOutputCalc_witness.wtns PedersenOutputCalc_witness.json`, {stdio: 'inherit'});
  
  // Read the witness JSON
  const witness = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  
  // Return the hash values (should be at indices 1 and 2 in the witness array)
  return [witness[1], witness[2]];
}

async function main() {
  try {
    // Create inputs directory if it doesn't exist
    const inputsDir = path.join(__dirname, '../inputs');
    if (!fs.existsSync(inputsDir)) {
      fs.mkdirSync(inputsDir, { recursive: true });
    }
    
    // Define test inputs
    const amount = "1";
    const owner = "2";
    const salt = "3";
    
    // Calculate hash using Pedersen
    console.log("Calculating Pedersen hash...");
    const [hash_x, hash_y] = calculatePedersenHash(amount, owner, salt);
    
    console.log("Generated hash values:");
    console.log("hash_x:", hash_x);
    console.log("hash_y:", hash_y);
    
    // Create input files for both test circuits
    const pedersenTestInput = {
      amount_in: amount,
      owner_in: owner,
      salt_in: salt,
      expected_hash: [hash_x, hash_y]
    };
    
    const pedersenAssertInput = {
      amount_in: amount,
      owner_in: owner,
      salt_in: salt,
      expected_hash: [hash_x, hash_y]
    };
    
    // Write the test inputs to files
    fs.writeFileSync(
      path.join(inputsDir, 'pedersen_test_input.json'),
      JSON.stringify(pedersenTestInput, null, 2)
    );
    
    fs.writeFileSync(
      path.join(inputsDir, 'pedersen_assert_input.json'),
      JSON.stringify(pedersenAssertInput, null, 2)
    );
    
    console.log("Successfully generated and wrote Pedersen test input files!");
    
  } catch (error) {
    console.error("Error:", error);
    console.error(error.stack);
  }
}

// Run main function
main(); 