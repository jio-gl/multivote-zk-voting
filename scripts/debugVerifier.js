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
  
  console.log("=== Debugging Vote Commit Verifier ===");
  
  // Read input
  const commitInputPath = path.join(inputsDir, "vote_commit_input.json");
  const commitInputJson = fs.readFileSync(commitInputPath, 'utf8');
  const commitInput = JSON.parse(commitInputJson);
  
  console.log("Input data:", commitInput);
  
  // Generate witness
  const inputPath = path.join(tempDir, "vote_commit_input.json");
  const witnessPath = path.join(tempDir, "vote_commit_witness.wtns");
  
  // Save input to file
  fs.writeFileSync(inputPath, JSON.stringify(commitInput));
  
  try {
    console.log("Generating witness...");
    execSync(
      `node ${buildDir}/vote_commit_js/generate_witness.js ${buildDir}/vote_commit_js/vote_commit.wasm ${inputPath} ${witnessPath}`,
      { stdio: "inherit" }
    );
    
    // Export witness to JSON for debugging
    const witnessJsonPath = path.join(tempDir, "vote_commit_witness.json");
    execSync(
      `snarkjs wtns export json ${witnessPath} ${witnessJsonPath}`,
      { stdio: "inherit" }
    );
    
    // Read witness for examination
    const witnessJson = JSON.parse(fs.readFileSync(witnessJsonPath, 'utf8'));
    console.log("Witness output:", witnessJson[1]);
    
    // Path to the zkey file
    const zkeyPath = path.join(zkeyDir, "vote_commit_final.zkey");
    
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
    const CommitVerifier = await ethers.getContractFactory("VoteCommitVerifier");
    const verifier = await CommitVerifier.deploy();
    await verifier.waitForDeployment();
    
    const verifierAddress = await verifier.getAddress();
    console.log("Verifier deployed at:", verifierAddress);
    
    // Convert the commitment to hex for the contract
    const commitmentHex = "0x" + BigInt(commitInput.commitment).toString(16).padStart(64, '0');
    console.log("Commitment hex for contract:", commitmentHex);
    
    // Verify the proof directly
    try {
      console.log("Verifying proof with commitment:", BigInt(commitInput.commitment).toString());
      const isValid = await verifier.verifyProof(
        formattedProof.a,
        formattedProof.b,
        formattedProof.c,
        [BigInt(commitInput.commitment)]
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