#!/bin/bash
# Script to generate Solidity verifier contracts for all circuits

# Create directories if they don't exist
mkdir -p build/verifiers
mkdir -p contracts/verifiers

echo "=============== Setting up Powers of Tau ==============="
# We'll generate our own ptau file for this demonstration
# For production, you would use the Hermez trusted setup files

# Start a new powers of tau ceremony
echo "Starting a new powers of tau ceremony..."
snarkjs powersoftau new bn128 12 build/pot12_0000.ptau

# Contribute to the ceremony with random entropy from /dev/urandom
echo "Contributing to the ceremony with system entropy..."
snarkjs powersoftau contribute build/pot12_0000.ptau build/pot12_0001.ptau --name="First contribution" -e="$(head -c 64 /dev/urandom | xxd -ps -c 64)"

# Verify the protocol so far
echo "Verifying the contribution..."
snarkjs powersoftau verify build/pot12_0001.ptau

# Apply a random beacon from /dev/urandom
echo "Applying a random beacon..."
snarkjs powersoftau beacon build/pot12_0001.ptau build/pot12_beacon.ptau $(head -c 32 /dev/urandom | xxd -ps -c 32) 10

# Prepare phase 2
echo "Preparing for phase 2..."
snarkjs powersoftau prepare phase2 build/pot12_beacon.ptau build/pot12_final.ptau -v

# Function to process a circuit
process_circuit() {
  CIRCUIT_NAME=$1
  OUTPUT_NAME=$2
  echo ""
  echo "=============== Processing $CIRCUIT_NAME ==============="
  
  # Compile the circuit to r1cs
  echo "Compiling $CIRCUIT_NAME to r1cs..."
  circom circuits/$CIRCUIT_NAME.circom --r1cs --wasm -o build
  
  # Setup using Groth16
  echo "Setting up zkey with Groth16..."
  snarkjs groth16 setup build/$CIRCUIT_NAME.r1cs build/pot12_final.ptau build/${CIRCUIT_NAME}_0000.zkey
  
  # Contribute to the phase 2 ceremony with entropy from /dev/urandom
  echo "Contributing to phase 2 ceremony with system entropy..."
  snarkjs zkey contribute build/${CIRCUIT_NAME}_0000.zkey build/${CIRCUIT_NAME}_0001.zkey --name="First contribution" -e="$(head -c 64 /dev/urandom | xxd -ps -c 64)"
  
  # Apply a random beacon from /dev/urandom
  echo "Applying a random beacon..."
  snarkjs zkey beacon build/${CIRCUIT_NAME}_0001.zkey build/${CIRCUIT_NAME}_final.zkey $(head -c 32 /dev/urandom | xxd -ps -c 32) 10
  
  # Verify the final zkey
  echo "Verifying the final zkey..."
  snarkjs zkey verify build/$CIRCUIT_NAME.r1cs build/pot12_final.ptau build/${CIRCUIT_NAME}_final.zkey
  
  # Export the verification key to JSON
  echo "Exporting verification key to JSON..."
  snarkjs zkey export verificationkey build/${CIRCUIT_NAME}_final.zkey build/${CIRCUIT_NAME}_verification_key.json
  
  # Generate Solidity verifier
  echo "Generating Solidity verifier..."
  snarkjs zkey export solidityverifier build/${CIRCUIT_NAME}_final.zkey contracts/verifiers/${OUTPUT_NAME}.sol
  
  # Fix import path in the Solidity verifier
  echo "Fixing import paths in Solidity verifier..."
  sed -i.bak 's/pragma solidity \^0.6.11/pragma solidity \^0.8.0/g' contracts/verifiers/${OUTPUT_NAME}.sol
  
  # Rename the contract from Groth16Verifier to match the file name
  echo "Renaming contract to ${OUTPUT_NAME}..."
  sed -i.bak "s/contract Groth16Verifier/contract ${OUTPUT_NAME}/g" contracts/verifiers/${OUTPUT_NAME}.sol
  
  if [ -f "contracts/verifiers/${OUTPUT_NAME}.sol.bak" ]; then
    rm -f contracts/verifiers/${OUTPUT_NAME}.sol.bak
  fi
  
  echo "$CIRCUIT_NAME verifier generated successfully!"
}

# Process each circuit
echo ""
echo "=============== Generating Verifiers ==============="
process_circuit "vote_commit" "VoteCommitVerifier"
process_circuit "vote_reveal" "VoteRevealVerifier"

echo ""
echo "=============== Summary ==============="
echo "All verifiers generated successfully!"
echo "You can find the Solidity verifiers in contracts/verifiers/" 