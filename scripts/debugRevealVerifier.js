const { ethers } = require("hardhat");
const fs = require("fs-extra");
const path = require("path");
const snarkjs = require("snarkjs");
const { execSync } = require("child_process");

// Directories and files
const buildDir = path.join(__dirname, "../build");
const tempDir = path.join(__dirname, "../temp");
const inputsDir = path.join(__dirname, "../inputs");
const zkeyDir = path.join(__dirname, "../build");

async function main() {
  // Create necessary directories
  fs.ensureDirSync(tempDir);
  
  console.log("=== Debugging Vote Reveal Verifier ===");
  
  // Read input
  const revealInputPath = path.join(inputsDir, "vote_reveal_input.json");
  const revealInputJson = fs.readFileSync(revealInputPath, 'utf8');
  const revealInput = JSON.parse(revealInputJson);
  
  console.log("Input data:", revealInput);
  
  // Generate witness
  const inputPath = path.join(tempDir, "vote_reveal_input.json");
  const witnessPath = path.join(tempDir, "vote_reveal_witness.wtns");
  
  // Save input to file
  fs.writeFileSync(inputPath, JSON.stringify(revealInput));
  
  try {
    console.log("Generating witness...");
    execSync(
      `node ${buildDir}/vote_reveal_js/generate_witness.js ${buildDir}/vote_reveal_js/vote_reveal.wasm ${inputPath} ${witnessPath}`,
      { stdio: "inherit" }
    );
    
    // Export witness to JSON for debugging
    const witnessJsonPath = path.join(tempDir, "vote_reveal_witness.json");
    execSync(
      `snarkjs wtns export json ${witnessPath} ${witnessJsonPath}`,
      { stdio: "inherit" }
    );
    
    // Read witness for examination
    const witnessJson = JSON.parse(fs.readFileSync(witnessJsonPath, 'utf8'));
    console.log("Witness output (public signals):", witnessJson.slice(1, 5));
    
    // Path to the zkey file
    const zkeyPath = path.join(zkeyDir, "vote_reveal_final.zkey");
    
    if (!fs.existsSync(zkeyPath)) {
      console.log(`Warning: ${zkeyPath} not found. Can't generate proof.`);
      return;
    }
    
    // Generate proof
    console.log("Generating proof...");
    const { proof, publicSignals } = await snarkjs.groth16.prove(
      zkeyPath,
      witnessPath
    );
    
    console.log("Proof:", JSON.stringify(proof, null, 2));
    console.log("Public Signals:", publicSignals);
    
    // Format proof for the contract
    const formattedProof = {
      a: [proof.pi_a[0], proof.pi_a[1]],
      b: [
        [proof.pi_b[0][1], proof.pi_b[0][0]],
        [proof.pi_b[1][1], proof.pi_b[1][0]]
      ],
      c: [proof.pi_c[0], proof.pi_c[1]]
    };
    
    console.log("Formatted proof:", JSON.stringify(formattedProof, null, 2));
    
    // Now deploy the verifier and test it
    console.log("\nDeploying and testing the verifier...");
    const [owner] = await ethers.getSigners();
    
    // Deploy the real verifier
    const RevealVerifier = await ethers.getContractFactory("VoteRevealVerifier");
    const verifier = await RevealVerifier.deploy();
    await verifier.waitForDeployment();
    
    const verifierAddress = await verifier.getAddress();
    console.log("Verifier deployed at:", verifierAddress);
    
    // Convert values for the contract
    const choice = BigInt(revealInput.choice).toString();
    const nullifierHex = "0x" + BigInt(revealInput.nullifier).toString(16).padStart(64, '0');
    const sender = BigInt(revealInput.sender).toString();
    const ballotId = BigInt(revealInput.ballotId).toString();
    
    console.log("Verifying proof with inputs:");
    console.log("- Choice:", choice);
    console.log("- Nullifier:", BigInt(revealInput.nullifier).toString());
    console.log("- Sender:", sender);
    console.log("- Ballot ID:", ballotId);
    
    // Verify the proof directly
    try {
      const isValid = await verifier.verifyProof(
        formattedProof.a,
        formattedProof.b,
        formattedProof.c,
        [
          BigInt(revealInput.choice), 
          BigInt(revealInput.nullifier),
          BigInt(revealInput.sender),
          BigInt(revealInput.ballotId)
        ]
      );
      
      console.log("Proof verification result:", isValid);
    } catch (error) {
      console.log("Error verifying proof:", error.message);
    }
    
    console.log("\n=== Done ===");
  } catch (error) {
    console.error("Error:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 