#!/usr/bin/env node

const { buildPedersenHash, buildBabyjub } = require("circomlibjs");
const fs = require("fs");
const path = require("path");

// Ensure temp directory exists
const tempDir = path.join(__dirname, '../temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

async function debugPedersenHash() {
  try {
    // Initialize the pedersen hash and babyjub
    const pedersen = await buildPedersenHash();
    const babyJub = await buildBabyjub();
    
    // Load the withdrawal input
    const withdrawalInput = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../inputs/pedersen_assert_input.json'), 'utf8')
    );
    
    // Convert string values to BigInt
    const amount_in = BigInt(withdrawalInput.amount_in);
    const owner_in = BigInt(withdrawalInput.owner_in);
    const salt_in = BigInt(withdrawalInput.salt_in);
    
    console.log("=== Input Values ===");
    console.log(`amount_in: ${amount_in}`);
    console.log(`owner_in: ${owner_in}`);
    console.log(`salt_in: ${salt_in}`);
    
    // Test the LSB first bit ordering (least significant bit first)
    console.log("\n=== Testing LSB (Least Significant Bit) First ===");
    
    // Convert each value to bits - LSB first
    const amountBitsLSB = bigintToBitsLSB(amount_in, 64);
    const ownerBitsLSB = bigintToBitsLSB(owner_in, 64);
    const saltBitsLSB = bigintToBitsLSB(salt_in, 64);
    
    console.log("\n=== Bit Representations (LSB first) ===");
    console.log(`amount_in bits: ${amountBitsLSB.join('')}`);
    console.log(`owner_in bits: ${ownerBitsLSB.join('')}`);
    console.log(`salt_in bits: ${saltBitsLSB.join('')}`);
    
    // Create the combined preimage
    const preimageLSB = [...amountBitsLSB, ...ownerBitsLSB, ...saltBitsLSB];
    console.log(`\nTotal bits: ${preimageLSB.length}`);
    
    // Calculate the hash with LSB ordering
    const hashBufLSB = pedersen.hash(preimageLSB);
    const pointLSB = babyJub.unpackPoint(hashBufLSB);
    const commitmentLSB = [
      babyJub.F.toString(pointLSB[0]),
      babyJub.F.toString(pointLSB[1])
    ];
    
    console.log("\n=== Calculated Commitment (LSB first) ===");
    console.log(`X: ${commitmentLSB[0]}`);
    console.log(`Y: ${commitmentLSB[1]}`);
    
    // Test the MSB first bit ordering (most significant bit first)
    console.log("\n\n=== Testing MSB (Most Significant Bit) First ===");
    
    // Convert each value to bits - MSB first
    const amountBitsMSB = bigintToBitsMSB(amount_in, 64);
    const ownerBitsMSB = bigintToBitsMSB(owner_in, 64);
    const saltBitsMSB = bigintToBitsMSB(salt_in, 64);
    
    console.log("\n=== Bit Representations (MSB first) ===");
    console.log(`amount_in bits: ${amountBitsMSB.join('')}`);
    console.log(`owner_in bits: ${ownerBitsMSB.join('')}`);
    console.log(`salt_in bits: ${saltBitsMSB.join('')}`);
    
    // Create the combined preimage
    const preimageMSB = [...amountBitsMSB, ...ownerBitsMSB, ...saltBitsMSB];
    console.log(`\nTotal bits: ${preimageMSB.length}`);
    
    // Calculate the hash with MSB ordering
    const hashBufMSB = pedersen.hash(preimageMSB);
    const pointMSB = babyJub.unpackPoint(hashBufMSB);
    const commitmentMSB = [
      babyJub.F.toString(pointMSB[0]),
      babyJub.F.toString(pointMSB[1])
    ];
    
    console.log("\n=== Calculated Commitment (MSB first) ===");
    console.log(`X: ${commitmentMSB[0]}`);
    console.log(`Y: ${commitmentMSB[1]}`);
    
    console.log("\n=== Expected Commitment (from input file) ===");
    console.log(`X: ${withdrawalInput.expected_hash[0]}`);
    console.log(`Y: ${withdrawalInput.expected_hash[1]}`);
    
    // Compare LSB results
    const matchesXLSB = commitmentLSB[0] === withdrawalInput.expected_hash[0];
    const matchesYLSB = commitmentLSB[1] === withdrawalInput.expected_hash[1];
    
    console.log("\n=== LSB Matches ===");
    console.log(`X matches: ${matchesXLSB}`);
    console.log(`Y matches: ${matchesYLSB}`);
    console.log(`Overall match: ${matchesXLSB && matchesYLSB}`);
    
    // Compare MSB results
    const matchesXMSB = commitmentMSB[0] === withdrawalInput.expected_hash[0];
    const matchesYMSB = commitmentMSB[1] === withdrawalInput.expected_hash[1];
    
    console.log("\n=== MSB Matches ===");
    console.log(`X matches: ${matchesXMSB}`);
    console.log(`Y matches: ${matchesYMSB}`);
    console.log(`Overall match: ${matchesXMSB && matchesYMSB}`);
    
    // Save outputs to temp directory if needed
    const debugResults = {
      lsb: {
        commitment: commitmentLSB,
        matches: { x: matchesXLSB, y: matchesYLSB }
      },
      msb: {
        commitment: commitmentMSB,
        matches: { x: matchesXMSB, y: matchesYMSB }
      }
    };
    fs.writeFileSync(path.join(tempDir, 'debug_hash_results.json'), JSON.stringify(debugResults, null, 2));
    
  } catch (error) {
    console.error("Error:", error);
  }
}

// Convert a BigInt to its binary representation as an array of 0s and 1s (least significant bit first)
function bigintToBitsLSB(n, bitLength) {
  const bits = [];
  for (let i = 0; i < bitLength; i++) {
    bits.push(Number((n >> BigInt(i)) & 1n));
  }
  return bits;
}

// Convert a BigInt to its binary representation as an array of 0s and 1s (most significant bit first)
function bigintToBitsMSB(n, bitLength) {
  const bits = [];
  for (let i = bitLength - 1; i >= 0; i--) {
    bits.push(Number((n >> BigInt(i)) & 1n));
  }
  return bits;
}

debugPedersenHash().catch(console.error); 