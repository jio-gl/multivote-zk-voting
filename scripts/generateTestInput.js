const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const { ethers } = require('hardhat');

const tempDir = path.join(__dirname, '../temp');
const buildDir = path.join(__dirname, '../build');
const inputsDir = path.join(__dirname, '../inputs');

async function main() {
  // Create necessary directories
  fs.ensureDirSync(tempDir);
  fs.ensureDirSync(inputsDir);
  
  console.log("Generating test inputs with the actual account address...");
  
  // Get alice's address
  const [owner, alice] = await ethers.getSigners();
  const aliceAddress = await alice.getAddress();
  
  // Convert alice's address to a decimal for the circuit
  const aliceAddressDecimal = ethers.toBigInt(aliceAddress).toString();
  console.log("Alice's address:", aliceAddress);
  console.log("Alice's address as decimal:", aliceAddressDecimal);
  
  // Reuse the same values from the existing inputs
  const existingCommitInput = JSON.parse(fs.readFileSync(path.join(inputsDir, 'vote_commit_input.json'), 'utf8'));
  const existingRevealInput = JSON.parse(fs.readFileSync(path.join(inputsDir, 'vote_reveal_input.json'), 'utf8'));
  
  // Create new inputs with alice's address
  const newRevealInput = {
    ...existingRevealInput,
    sender: aliceAddressDecimal
  };
  
  const newCommitInput = {
    choice: existingCommitInput.choice,
    revealAddress: aliceAddressDecimal,
    salt: existingCommitInput.salt,
    ballotId: existingCommitInput.ballotId
  };
  
  // We need to recalculate commitments with these new inputs
  console.log("Creating new inputs with alice's address...");
  
  // Save the input to a temporary file
  const tempCommitInputPath = path.join(tempDir, 'commit_input_test.json');
  fs.writeFileSync(tempCommitInputPath, JSON.stringify(newCommitInput));
  
  // Create a small circuit just to calculate the commitment
  const commitCalculatorCircuit = `
pragma circom 2.0.0;
include "../node_modules/circomlib/circuits/poseidon.circom";

template CommitmentCalculator() {
    signal input choice;
    signal input revealAddress;
    signal input salt;
    signal input ballotId;
    signal output commitment;
    
    component hasher = Poseidon(4);
    hasher.inputs[0] <== choice;
    hasher.inputs[1] <== revealAddress;
    hasher.inputs[2] <== salt;
    hasher.inputs[3] <== ballotId;
    
    commitment <== hasher.out;
}

component main = CommitmentCalculator();
`;
  
  const calculatorCircuitPath = path.join(tempDir, 'CommitmentCalculator.circom');
  fs.writeFileSync(calculatorCircuitPath, commitCalculatorCircuit);
  
  // Compile the calculator circuit
  console.log("Compiling calculator circuit...");
  execSync(`circom ${calculatorCircuitPath} --r1cs --wasm -o ${tempDir}`, { stdio: 'inherit' });
  
  // Generate witness to calculate the commitment
  console.log("Calculating new commitment...");
  execSync(
    `node ${tempDir}/CommitmentCalculator_js/generate_witness.js ${tempDir}/CommitmentCalculator_js/CommitmentCalculator.wasm ${tempCommitInputPath} ${tempDir}/commitment_witness.wtns`,
    { stdio: 'inherit' }
  );
  
  // Export the witness to JSON to get the commitment
  execSync(`snarkjs wtns export json ${tempDir}/commitment_witness.wtns ${tempDir}/commitment_witness.json`, {
    stdio: 'inherit'
  });
  
  // Read the commitment from the witness
  const witnessJson = JSON.parse(fs.readFileSync(path.join(tempDir, 'commitment_witness.json'), 'utf8'));
  const newCommitment = witnessJson[1]; // First output signal is the commitment
  
  console.log("New commitment:", newCommitment);
  
  // Update the commitment in both input files
  newCommitInput.commitment = newCommitment;
  
  // Do the same for the nullifier
  console.log("Calculating new nullifier...");
  const nullifierCalculatorCircuit = `
pragma circom 2.0.0;
include "../node_modules/circomlib/circuits/poseidon.circom";

template NullifierCalculator() {
    signal input sender;
    signal input salt;
    signal output nullifier;
    
    component hasher = Poseidon(2);
    hasher.inputs[0] <== sender;
    hasher.inputs[1] <== salt;
    
    nullifier <== hasher.out;
}

component main = NullifierCalculator();
`;
  
  const nullifierCircuitPath = path.join(tempDir, 'NullifierCalculator.circom');
  fs.writeFileSync(nullifierCircuitPath, nullifierCalculatorCircuit);
  
  // Create nullifier input
  const nullifierInput = {
    sender: aliceAddressDecimal,
    salt: newRevealInput.salt
  };
  
  // Save nullifier input to file
  const tempNullifierInputPath = path.join(tempDir, 'nullifier_input_test.json');
  fs.writeFileSync(tempNullifierInputPath, JSON.stringify(nullifierInput));
  
  // Compile the nullifier calculator circuit
  console.log("Compiling nullifier calculator circuit...");
  execSync(`circom ${nullifierCircuitPath} --r1cs --wasm -o ${tempDir}`, { stdio: 'inherit' });
  
  // Generate witness to calculate the nullifier
  console.log("Calculating new nullifier...");
  execSync(
    `node ${tempDir}/NullifierCalculator_js/generate_witness.js ${tempDir}/NullifierCalculator_js/NullifierCalculator.wasm ${tempNullifierInputPath} ${tempDir}/nullifier_witness.wtns`,
    { stdio: 'inherit' }
  );
  
  // Export the witness to JSON to get the nullifier
  execSync(`snarkjs wtns export json ${tempDir}/nullifier_witness.wtns ${tempDir}/nullifier_witness.json`, {
    stdio: 'inherit'
  });
  
  // Read the nullifier from the witness
  const nullifierWitnessJson = JSON.parse(fs.readFileSync(path.join(tempDir, 'nullifier_witness.json'), 'utf8'));
  const newNullifier = nullifierWitnessJson[1]; // First output signal is the nullifier
  
  console.log("New nullifier:", newNullifier);
  
  // Update the nullifier in the reveal input file
  newRevealInput.nullifier = newNullifier;
  
  // Save the new input files with alice's address
  fs.writeFileSync(path.join(inputsDir, 'test_vote_commit_input.json'), JSON.stringify(newCommitInput, null, 2));
  fs.writeFileSync(path.join(inputsDir, 'test_vote_reveal_input.json'), JSON.stringify(newRevealInput, null, 2));
  
  console.log("Successfully generated new test inputs with alice's address!");
  console.log("Commit input file: test_vote_commit_input.json");
  console.log("Reveal input file: test_vote_reveal_input.json");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  }); 