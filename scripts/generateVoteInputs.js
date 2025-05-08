#!/usr/bin/env node

/**
 * This script generates inputs for the MultiVote privacy system.
 * It calculates commitments for vote commits and reveals.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Try to use the poseidon hash from circomlib if available
let poseidon;
try {
  const circomlibPath = require.resolve('circomlib');
  const circomlibDir = path.dirname(circomlibPath);
  poseidon = require(path.join(circomlibDir, 'src/poseidon.js'));
} catch (error) {
  console.error("Warning: circomlib's poseidon.js not found. Using temporary implementation.");
  // This is a placeholder for the actual poseidon hash implementation
  // In production, you would use the actual implementation from circomlib
  poseidon = {
    hash: (inputs) => {
      const str = inputs.join('|');
      const hash = crypto.createHash('sha256').update(str).digest('hex');
      return BigInt('0x' + hash) % (BigInt(2) ** BigInt(254)); // Simulate field size
    }
  };
}

// Generate a truly random salt as a decimal number using high-quality entropy
function generateSecureRandomValue() {
  // Use a Buffer for more secure randomness
  const buf = Buffer.alloc(32); // 256 bits of entropy
  crypto.randomFillSync(buf); // Use synchronous randomFill for better entropy
  return BigInt('0x' + buf.toString('hex')).toString();
}

const randomSalt = generateSecureRandomValue();

// Matching the circuit structure:
// VoteCommitmentCircuit: choice, revealAddress, salt, ballotId -> commitment
// VoteRevealCircuit: salt (private) + choice, nullifier, sender, ballotId (public)

// Inputs for vote commit
const voteCommit = {
  choice: "1",         // Vote choice (1 = yes, 0 = no, etc.)
  revealAddress: "123456789", // Address that will be used to reveal
  salt: randomSalt,    // Random salt
  ballotId: "1"        // Ballot ID
};

console.log("Generating voting commitments and inputs...");

// Calculate commitment using poseidon hash
function calculateCommitment(choice, revealAddress, salt, ballotId) {
  // Create temporary circuit to calculate commitment
  const tempDir = path.join(__dirname, '../temp');
  
  // Create temp directory if it doesn't exist
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  // Generate circuit
  const circuitCode = `
pragma circom 2.0.0;
include "../node_modules/circomlib/circuits/poseidon.circom";

template CommitmentCalculator() {
    signal input choice;
    signal input revealAddress;
    signal input salt;
    signal input ballotId;
    signal output commitment;
    
    component commitmentHasher = Poseidon(4);
    commitmentHasher.inputs[0] <== choice;
    commitmentHasher.inputs[1] <== revealAddress;
    commitmentHasher.inputs[2] <== salt;
    commitmentHasher.inputs[3] <== ballotId;
    
    commitment <== commitmentHasher.out;
}

component main = CommitmentCalculator();
`;
  
  const inputData = {
    choice: choice,
    revealAddress: revealAddress,
    salt: salt,
    ballotId: ballotId
  };
  
  const circuitPath = path.join(tempDir, 'CommitmentCalculator.circom');
  const inputPath = path.join(tempDir, 'CommitmentCalculator_input.json');
  const witnessPath = path.join(tempDir, 'CommitmentCalculator_witness.wtns');
  const jsonPath = path.join(tempDir, 'CommitmentCalculator_witness.json');
  
  // Write the circuit to a temporary file
  console.log('Creating CommitmentCalculator circuit...');
  fs.writeFileSync(circuitPath, circuitCode);
  
  // Write the input values to a temporary file
  console.log('Creating CommitmentCalculator input...');
  fs.writeFileSync(inputPath, JSON.stringify(inputData, null, 2));
  
  // Compile the circuit
  console.log('Compiling CommitmentCalculator circuit...');
  execSync(`cd ${tempDir} && circom CommitmentCalculator.circom --r1cs --wasm -o ${tempDir}`, {stdio: 'inherit'});
  
  // Generate the witness
  console.log('Generating CommitmentCalculator witness...');
  execSync(`cd ${tempDir} && node CommitmentCalculator_js/generate_witness.js CommitmentCalculator_js/CommitmentCalculator.wasm CommitmentCalculator_input.json CommitmentCalculator_witness.wtns`, {stdio: 'inherit'});
  
  // Export the witness to JSON
  console.log('Exporting CommitmentCalculator witness to JSON...');
  execSync(`cd ${tempDir} && snarkjs wtns export json CommitmentCalculator_witness.wtns CommitmentCalculator_witness.json`, {stdio: 'inherit'});
  
  // Read the witness JSON
  const witness = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  
  // Return the commitment (should be at index 1 in the witness array)
  return witness[1];
}

// Calculate nullifier using poseidon hash
function calculateNullifier(sender, salt) {
  // Create temporary circuit to calculate nullifier
  const tempDir = path.join(__dirname, '../temp');
  
  // Create temp directory if it doesn't exist
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  // Generate circuit
  const circuitCode = `
pragma circom 2.0.0;
include "../node_modules/circomlib/circuits/poseidon.circom";

template NullifierCalculator() {
    signal input sender;
    signal input salt;
    signal output nullifier;
    
    component nullifierHasher = Poseidon(2);
    nullifierHasher.inputs[0] <== sender;
    nullifierHasher.inputs[1] <== salt;
    
    nullifier <== nullifierHasher.out;
}

component main = NullifierCalculator();
`;
  
  const inputData = {
    sender: sender,
    salt: salt
  };
  
  const circuitPath = path.join(tempDir, 'NullifierCalculator.circom');
  const inputPath = path.join(tempDir, 'NullifierCalculator_input.json');
  const witnessPath = path.join(tempDir, 'NullifierCalculator_witness.wtns');
  const jsonPath = path.join(tempDir, 'NullifierCalculator_witness.json');
  
  // Write the circuit to a temporary file
  console.log('Creating NullifierCalculator circuit...');
  fs.writeFileSync(circuitPath, circuitCode);
  
  // Write the input values to a temporary file
  console.log('Creating NullifierCalculator input...');
  fs.writeFileSync(inputPath, JSON.stringify(inputData, null, 2));
  
  // Compile the circuit
  console.log('Compiling NullifierCalculator circuit...');
  execSync(`cd ${tempDir} && circom NullifierCalculator.circom --r1cs --wasm -o ${tempDir}`, {stdio: 'inherit'});
  
  // Generate the witness
  console.log('Generating NullifierCalculator witness...');
  execSync(`cd ${tempDir} && node NullifierCalculator_js/generate_witness.js NullifierCalculator_js/NullifierCalculator.wasm NullifierCalculator_input.json NullifierCalculator_witness.wtns`, {stdio: 'inherit'});
  
  // Export the witness to JSON
  console.log('Exporting NullifierCalculator witness to JSON...');
  execSync(`cd ${tempDir} && snarkjs wtns export json NullifierCalculator_witness.wtns NullifierCalculator_witness.json`, {stdio: 'inherit'});
  
  // Read the witness JSON
  const witness = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  
  // Return the nullifier (should be at index 1 in the witness array)
  return witness[1];
}

async function main() {
  try {
    // Create inputs directory if it doesn't exist
    const inputsDir = path.join(__dirname, '../inputs');
    if (!fs.existsSync(inputsDir)) {
      fs.mkdirSync(inputsDir, { recursive: true });
    }
    
    // Calculate commitment
    console.log("Calculating commitment...");
    const commitment = calculateCommitment(
      voteCommit.choice,
      voteCommit.revealAddress,
      voteCommit.salt,
      voteCommit.ballotId
    );
    
    console.log("Commitment:", commitment);
    
    // Calculate nullifier
    console.log("Calculating nullifier...");
    const nullifier = calculateNullifier(voteCommit.revealAddress, voteCommit.salt);
    
    console.log("Nullifier:", nullifier);
    
    // Create input files
    const voteCommitInput = {
      choice: voteCommit.choice,
      revealAddress: voteCommit.revealAddress,
      salt: voteCommit.salt,
      ballotId: voteCommit.ballotId,
      commitment: commitment  // Public input
    };
    
    const voteRevealInput = {
      salt: voteCommit.salt,  // Private input
      choice: voteCommit.choice,  // Public input
      nullifier: nullifier,  // Public input
      sender: voteCommit.revealAddress,  // Public input (same as revealAddress)
      ballotId: voteCommit.ballotId  // Public input
    };
    
    // Write the commit and reveal inputs to files
    fs.writeFileSync(
      path.join(__dirname, '../inputs/vote_commit_input.json'),
      JSON.stringify(voteCommitInput, null, 2)
    );
    
    fs.writeFileSync(
      path.join(__dirname, '../inputs/vote_reveal_input.json'),
      JSON.stringify(voteRevealInput, null, 2)
    );
    
    console.log("Successfully generated and wrote vote input files!");
    console.log(`Commit file: ${path.join(__dirname, '../inputs/vote_commit_input.json')}`);
    console.log(`Reveal file: ${path.join(__dirname, '../inputs/vote_reveal_input.json')}`);
    
  } catch (error) {
    console.error("Error:", error);
    console.error(error.stack);
  }
}

// Run main function
main(); 