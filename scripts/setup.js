const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const snarkjs = require("snarkjs");

async function main() {
  console.log("Setting up ZK circuits...");
  
  // Create necessary directories
  if (!fs.existsSync(path.join(__dirname, "../build"))) {
    fs.mkdirSync(path.join(__dirname, "../build"));
  }
  
  // Define circuit paths
  const circuits = [
    {
      name: "vote_commit",
      path: path.join(__dirname, "../circuits/vote_commit.circom")
    },
    {
      name: "vote_reveal",
      path: path.join(__dirname, "../circuits/vote_reveal.circom")
    }
  ];
  
  // Process each circuit
  for (const circuit of circuits) {
    console.log(`\nProcessing ${circuit.name} circuit...`);
    
    // 1. Compile the circuit
    console.log("Compiling circom circuit...");
    try {
      execSync(`circom ${circuit.path} --r1cs --wasm --sym --c -l ../node_modules -o ${path.join(__dirname, "../build")}`);
      console.log("Circuit compiled successfully.");
    } catch (error) {
      console.error("Error compiling circuit:", error.message);
      continue; // Skip to next circuit if compilation fails
    }
    
    // 2. Download or generate Powers of Tau file
    const ptauName = "powersOfTau28_hez_final_10.ptau";
    const ptauPath = path.join(__dirname, "../build", ptauName);
    
    if (!fs.existsSync(ptauPath)) {
      console.log("Downloading Powers of Tau file...");
      try {
        execSync(`curl -L https://hermez.s3-eu-west-1.amazonaws.com/${ptauName} -o ${ptauPath}`);
      } catch (error) {
        console.error("Error downloading Powers of Tau file:", error.message);
        continue;
      }
    }
    
    // 3. Generate zkey files
    console.log("Generating and contributing to zkey files...");
    const r1csPath = path.join(__dirname, `../build/${circuit.name}.r1cs`);
    const zkey0Path = path.join(__dirname, `../build/${circuit.name}_0000.zkey`);
    const zkeyFinalPath = path.join(__dirname, `../build/${circuit.name}_final.zkey`);
    const verificationKeyPath = path.join(__dirname, `../build/${circuit.name}_verification_key.json`);
    
    try {
      // Initial zkey
      await snarkjs.zKey.newZKey(r1csPath, ptauPath, zkey0Path);
      
      // Contribute to zkey
      await snarkjs.zKey.contribute(zkey0Path, zkeyFinalPath, "Contributor 1", "First contribution");
      
      // Export verification key
      const vKey = await snarkjs.zKey.exportVerificationKey(zkeyFinalPath);
      fs.writeFileSync(verificationKeyPath, JSON.stringify(vKey, null, 2));
      
      console.log(`${circuit.name} zkey files generated successfully.`);
    } catch (error) {
      console.error(`Error processing zkey for ${circuit.name}:`, error.message);
      continue;
    }
    
    // 4. Generate Solidity verifier
    console.log(`Generating Solidity verifier for ${circuit.name}...`);
    const verifierSolPath = path.join(__dirname, `../contracts/verifiers/${circuit.name}Verifier.sol`);
    
    try {
      const verifierCode = await snarkjs.zKey.exportSolidityVerifier(zkeyFinalPath);
      fs.writeFileSync(verifierSolPath, verifierCode);
      console.log(`${circuit.name} Solidity verifier generated at ${verifierSolPath}`);
    } catch (error) {
      console.error(`Error generating Solidity verifier for ${circuit.name}:`, error.message);
    }
    
    // 5. Copy final zkey to circuits directory for test scripts
    try {
      fs.copyFileSync(
        zkeyFinalPath,
        path.join(__dirname, `../circuits/${circuit.name.toLowerCase()}_final.zkey`)
      );
    } catch (error) {
      console.error(`Error copying zkey file:`, error.message);
    }
  }
  
  console.log("\nZK circuit setup complete!");
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 