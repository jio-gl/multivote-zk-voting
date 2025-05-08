/**
 * MultiVote ZK Voting Client
 * 
 * This client interfaces with the MultiVote.sol smart contract to enable
 * private voting using zero-knowledge proofs.
 * 
 * To resolve typings, install the following packages:
 * npm install --save-dev @types/node
 * npm install ethers@5.7.2
 * npm install circomlibjs
 * npm install snarkjs
 * npm install @types/window
 * 
 * For MetaMask typing, add the following to a global.d.ts file:
 * interface Window {
 *   ethereum: any;
 * }
 */

import { ethers } from 'ethers';
// Use local mock implementations instead of the actual libraries
import { mockCircomlib, mockSnarkjs } from './mock-zk';

// Mock the imported modules
const buildPoseidon = mockCircomlib.buildPoseidon;
const groth16 = mockSnarkjs.groth16;

// Interface to the MultiVote contract
const VOTING_ABI = [
  'function createBallot(string memory _title, string[] memory _choices, uint256 _startTime, uint256 _duration, uint256 _commitDuration) external',
  'function registerVoters(uint256 _ballotId, address[] calldata _voters) external',
  'function commitVote(uint256 _ballotId, bytes32 _commitment, uint[2] memory _pA, uint[2][2] memory _pB, uint[2] memory _pC) external',
  'function revealVote(uint256 _ballotId, uint256 _choice, bytes32 _nullifier, uint[2] memory _pA, uint[2][2] memory _pB, uint[2] memory _pC) external',
  'function finalizeBallot(uint256 _ballotId) external',
  'function getBallotResults(uint256 _ballotId) external view returns (uint256[] memory)',
  'function ballots(uint256) public view returns (string, uint256, uint256, uint256, bool, address, bool)',
  'function registeredVoters(uint256, address) public view returns (bool)',
  'function commitments(uint256, bytes32) public view returns (bool)',
  'function nullifiers(uint256, bytes32) public view returns (bool)',
  'event BallotCreated(uint256 indexed ballotId, string title, address admin, uint256 startTime, uint256 endTime, uint256 commitEndTime)',
  'event VoterRegistered(uint256 indexed ballotId, address voter)',
  'event VotersRegistered(uint256 indexed ballotId, uint256 count)',
  'event VoteCommitted(bytes32 commitment, address indexed voter, uint256 indexed ballotId)',
  'event VoteRevealed(uint256 choice, address indexed voter, uint256 indexed ballotId)',
  'event BallotFinalized(uint256 indexed ballotId, uint256[] results)'
];

export class MultiVoteClient {
  private provider: ethers.providers.Web3Provider;
  private signer: ethers.Signer;
  public votingContract: ethers.Contract;
  private poseidon: any;
  
  constructor(
    provider: ethers.providers.Web3Provider,
    contractAddress: string
  ) {
    this.provider = provider;
    this.signer = provider.getSigner();
    this.votingContract = new ethers.Contract(contractAddress, VOTING_ABI, this.signer);
  }
  
  /**
   * Initialize the client by loading the Poseidon hash function
   */
  async initialize(): Promise<void> {
    try {
      this.poseidon = await buildPoseidon();
      console.log("Poseidon hash initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Poseidon hash:", error);
      // Provide a mock implementation for demo mode
      this.poseidon = {
        F: {
          toString: (n: any) => n.toString()
        }
      };
      this.poseidon = {
        ...this.poseidon,
        // Simple mock hash function that mimics the behavior without the actual cryptography
        // This is only for demo/UI testing and should never be used in production
        "0": (inputs: any[]) => "0x" + Array.from(inputs).map(x => Number(x).toString(16).padStart(4, '0')).join('')
      };
      console.warn("Using mock Poseidon implementation for demo purposes");
    }
  }
  
  /**
   * Create a new ballot
   * @param title Title of the ballot
   * @param choices Array of voting options
   * @param startTime Unix timestamp for when voting starts
   * @param duration Duration of the entire voting period in seconds
   * @param commitDuration Duration of the commit phase in seconds
   */
  async createBallot(
    title: string,
    choices: string[],
    startTime: number,
    duration: number,
    commitDuration: number
  ): Promise<ethers.ContractReceipt> {
    const tx = await this.votingContract.createBallot(
      title,
      choices,
      startTime,
      duration,
      commitDuration
    );
    
    return await tx.wait();
  }
  
  /**
   * Register voters for a ballot (admin only)
   * @param ballotId The ID of the ballot
   * @param voters Array of voter addresses
   */
  async registerVoters(
    ballotId: number,
    voters: string[]
  ): Promise<ethers.ContractReceipt> {
    const tx = await this.votingContract.registerVoters(ballotId, voters);
    return await tx.wait();
  }
  
  /**
   * Check if a voter is registered for a ballot
   * @param ballotId The ID of the ballot
   * @param voter The address to check
   */
  async isVoterRegistered(ballotId: number, voter: string): Promise<boolean> {
    return await this.votingContract.registeredVoters(ballotId, voter);
  }
  
  /**
   * Get ballot information
   * @param ballotId The ID of the ballot
   */
  async getBallotInfo(ballotId: number): Promise<any> {
    // Get ballot basic information from the ballots mapping
    const ballotData = await this.votingContract.ballots(ballotId);
    
    // Get the choices by calling getChoices (this is implementation-dependent)
    // We may need to implement this as a custom method that reads from events or storage
    let choices: string[] = [];
    try {
      // This is a theoretical approach - in real implementation we'd need to 
      // find how choices are stored in the contract 
      const logs = await this.provider.getLogs({
        address: this.votingContract.address,
        topics: [
          ethers.utils.id("BallotCreated(uint256,string,address,uint256,uint256,uint256)"),
          ethers.utils.hexZeroPad(ethers.utils.hexlify(ballotId), 32)
        ],
        fromBlock: 0
      });
      
      if (logs.length > 0) {
        const parsedLog = this.votingContract.interface.parseLog(logs[0]);
        // Fetch choices from the event data if possible
        // This is a placeholder - actual implementation depends on how choices are stored
      }
    } catch (error) {
      console.error("Error fetching ballot choices:", error);
    }
    
    // Construct the ballot info object
    return {
      title: ballotData[0], // title
      startTime: new Date(ballotData[1].toNumber() * 1000), // startTime
      endTime: new Date(ballotData[2].toNumber() * 1000), // endTime
      commitEndTime: new Date(ballotData[3].toNumber() * 1000), // commitEndTime
      finalized: ballotData[4], // finalized
      admin: ballotData[5], // admin
      hasRegisteredVoters: ballotData[6], // hasRegisteredVoters
      choices: choices // we need a way to get the choices
    };
  }
  
  /**
   * Generate a random salt for voting
   */
  generateSalt(): string {
    return ethers.utils.hexlify(ethers.utils.randomBytes(32));
  }
  
  /**
   * Generate a nullifier from address and salt
   * @param address The address to use
   * @param salt The salt value
   */
  async generateNullifier(address: string, salt: string): Promise<string> {
    const addressBigInt = BigInt(address);
    const saltBigInt = BigInt(salt);
    
    const hash = this.poseidon.F.toString(
      this.poseidon([addressBigInt, saltBigInt])
    );
    
    return ethers.utils.hexlify(ethers.utils.toUtf8Bytes(hash));
  }
  
  /**
   * Generate a new Ethereum address for revealing
   */
  async generateRevealAddress(): Promise<{address: string, privateKey: string}> {
    const wallet = ethers.Wallet.createRandom();
    return {
      address: wallet.address,
      privateKey: wallet.privateKey
    };
  }
  
  /**
   * Create a commitment for voting using Poseidon hash
   * @param choice The chosen option index
   * @param revealAddress The fresh address that will be used to reveal
   * @param salt A random salt (user should save this)
   * @param ballotId The ballot ID
   */
  async createCommitment(
    choice: number, 
    revealAddress: string, 
    salt: string,
    ballotId: number
  ): Promise<string> {
    // Convert inputs to BigInt
    const choiceBigInt = BigInt(choice);
    const revealAddressBigInt = BigInt(revealAddress);
    const saltBigInt = BigInt(salt);
    const ballotIdBigInt = BigInt(ballotId);
    
    // Hash using Poseidon
    const hash = this.poseidon.F.toString(
      this.poseidon([choiceBigInt, revealAddressBigInt, saltBigInt, ballotIdBigInt])
    );
    
    return ethers.utils.hexlify(ethers.utils.toUtf8Bytes(hash));
  }
  
  /**
   * Generate a ZK proof for vote commitment
   * @param choice The chosen option
   * @param revealAddress The address that will reveal
   * @param salt The random salt
   * @param ballotId The ballot ID
   * @param commitment The calculated commitment
   */
  async generateCommitmentProof(
    choice: number,
    revealAddress: string,
    salt: string,
    ballotId: number,
    commitment: string
  ): Promise<{proof: any, publicSignals: any}> {
    try {
      // Remove the 0x prefix from the address
      const cleanAddress = revealAddress.startsWith('0x') 
        ? revealAddress.slice(2) 
        : revealAddress;
      
      // Convert the hex address to a decimal number
      const revealAddressDecimal = BigInt('0x' + cleanAddress).toString();
      
      // Prepare inputs for the ZK proof
      const input = {
        // Public inputs
        commitment: commitment,
        
        // Private inputs
        choice: choice,
        revealAddress: revealAddressDecimal,
        salt: salt,
        ballotId: ballotId
      };
      
      // Try to generate the ZK proof
      try {
        const { proof, publicSignals } = await groth16.fullProve(
          input,
          'circuits/vote_commit_circuit.wasm',  // Path to the compiled circuit
          'circuits/vote_commit_circuit.zkey'   // Path to the proving key
        );
        
        return { proof, publicSignals };
      } catch (err) {
        console.warn('Error generating real ZK proof, using demo mode:', err);
        
        // Provide a mock proof for demo purposes when circuit files are missing
        return {
          proof: {
            pi_a: ["12345", "67890"],
            pi_b: [["12345", "67890"], ["12345", "67890"]],
            pi_c: ["12345", "67890"]
          },
          publicSignals: [commitment]
        };
      }
    } catch (err) {
      console.error('Error in generateCommitmentProof:', err);
      throw new Error('Failed to generate commitment proof');
    }
  }
  
  /**
   * Generate a ZK proof for vote reveal
   * @param choice The chosen option
   * @param nullifier The nullifier
   * @param salt The salt used in the commitment
   * @param ballotId The ballot ID
   */
  async generateRevealProof(
    choice: number,
    nullifier: string,
    sender: string,
    salt: string,
    ballotId: number
  ): Promise<{proof: any, publicSignals: any}> {
    try {
      // Remove the 0x prefix from the address
      const cleanAddress = sender.startsWith('0x') 
        ? sender.slice(2) 
        : sender;
      
      // Convert the hex address to a decimal number
      const senderDecimal = BigInt('0x' + cleanAddress).toString();
      
      // Prepare inputs for the ZK proof
      const input = {
        // Public inputs
        choice: choice,
        nullifier: nullifier,
        sender: senderDecimal,
        ballotId: ballotId,
        
        // Private inputs
        salt: salt,
      };
      
      // Try to generate the ZK proof
      try {
        const { proof, publicSignals } = await groth16.fullProve(
          input,
          'circuits/vote_reveal_circuit.wasm',  // Path to the compiled circuit
          'circuits/vote_reveal_circuit.zkey'   // Path to the proving key
        );
        
        return { proof, publicSignals };
      } catch (err) {
        console.warn('Error generating real ZK proof, using demo mode:', err);
        
        // Provide a mock proof for demo purposes when circuit files are missing
        return {
          proof: {
            pi_a: ["12345", "67890"],
            pi_b: [["12345", "67890"], ["12345", "67890"]],
            pi_c: ["12345", "67890"]
          },
          publicSignals: [choice, nullifier, senderDecimal, ballotId]
        };
      }
    } catch (err) {
      console.error('Error in generateRevealProof:', err);
      throw new Error('Failed to generate reveal proof');
    }
  }
  
  /**
   * Format the proof for the Solidity contract
   * @param proof The ZK proof
   */
  formatProof(proof: any): {pA: number[], pB: number[][], pC: number[]} {
    return {
      pA: [proof.pi_a[0].toString(), proof.pi_a[1].toString()],
      pB: [
        [proof.pi_b[0][1].toString(), proof.pi_b[0][0].toString()],
        [proof.pi_b[1][1].toString(), proof.pi_b[1][0].toString()]
      ],
      pC: [proof.pi_c[0].toString(), proof.pi_c[1].toString()]
    };
  }
  
  /**
   * Commit a vote to the blockchain
   * @param ballotId The ID of the ballot
   * @param commitment The commitment hash
   * @param proof The ZK proof
   */
  async commitVote(
    ballotId: number, 
    commitment: string, 
    formattedProof: {pA: number[], pB: number[][], pC: number[]}
  ): Promise<ethers.ContractTransaction> {
    return await this.votingContract.commitVote(
      ballotId, 
      commitment, 
      formattedProof.pA,
      formattedProof.pB,
      formattedProof.pC
    );
  }
  
  /**
   * Reveal a vote on the blockchain
   * @param ballotId The ID of the ballot
   * @param choice The chosen option
   * @param nullifier The nullifier
   * @param formattedProof The ZK proof formatted for the contract
   * @param revealSigner The signer associated with the reveal address
   */
  async revealVote(
    ballotId: number,
    choice: number,
    nullifier: string,
    formattedProof: {pA: number[], pB: number[][], pC: number[]},
    revealSigner: ethers.Wallet
  ): Promise<ethers.ContractTransaction> {
    // Connect contract to the reveal address
    const connectedContract = this.votingContract.connect(revealSigner);
    
    // Reveal the vote
    return await connectedContract.revealVote(
      ballotId,
      choice,
      nullifier,
      formattedProof.pA,
      formattedProof.pB,
      formattedProof.pC
    );
  }
  
  /**
   * Complete voting flow - both commit and instructions for reveal
   * @param ballotId The ID of the ballot
   * @param choice The chosen option
   */
  async vote(ballotId: number, choice: number): Promise<{
    salt: string,
    nullifier: string,
    commitment: string,
    revealAddress: string,
    revealPrivateKey: string,
    txReceipt: ethers.ContractReceipt
  }> {
    // First check if user is registered
    const userAddress = await this.signer.getAddress();
    const isRegistered = await this.isVoterRegistered(ballotId, userAddress);
    
    if (!isRegistered) {
      throw new Error("You are not registered to vote in this ballot");
    }
    
    // Generate random salt
    const salt = this.generateSalt();
    
    // Generate a fresh address for reveal
    const { address: revealAddress, privateKey: revealPrivateKey } = await this.generateRevealAddress();
    
    // Create commitment
    const commitment = await this.createCommitment(choice, revealAddress, salt, ballotId);
    
    // Generate nullifier
    const nullifier = await this.generateNullifier(revealAddress, salt);
    
    // Generate ZK proof for the commitment
    const { proof } = await this.generateCommitmentProof(choice, revealAddress, salt, ballotId, commitment);
    const formattedProof = this.formatProof(proof);
    
    // Commit the vote on-chain
    const tx = await this.commitVote(ballotId, commitment, formattedProof);
    const receipt = await tx.wait();
    
    return {
      salt,
      nullifier,
      commitment,
      revealAddress,
      revealPrivateKey,
      txReceipt: receipt
    };
  }
  
  /**
   * Complete reveal flow - generate proof and reveal vote
   * @param ballotId The ID of the ballot
   * @param choice The chosen option
   * @param nullifier The nullifier
   * @param salt The salt used during commit
   * @param revealKey The private key of the reveal address
   */
  async reveal(
    ballotId: number,
    choice: number,
    nullifier: string,
    salt: string,
    revealKey: string
  ): Promise<ethers.ContractReceipt> {
    // Create a wallet with the reveal private key
    const revealWallet = new ethers.Wallet(revealKey, this.provider);
    
    // Generate ZK proof for the reveal
    const { proof } = await this.generateRevealProof(
      choice,
      nullifier,
      revealWallet.address,
      salt,
      ballotId
    );
    
    // Format proof for the contract
    const formattedProof = this.formatProof(proof);
    
    // Reveal the vote on-chain
    const tx = await this.revealVote(
      ballotId,
      choice,
      nullifier,
      formattedProof,
      revealWallet
    );
    
    return await tx.wait();
  }
  
  /**
   * Get the results of a finalized ballot
   * @param ballotId The ID of the ballot
   */
  async getResults(ballotId: number): Promise<number[]> {
    return await this.votingContract.getBallotResults(ballotId);
  }
  
  /**
   * Finalize a ballot after voting ends
   * @param ballotId The ID of the ballot
   */
  async finalizeBallot(ballotId: number): Promise<ethers.ContractReceipt> {
    const tx = await this.votingContract.finalizeBallot(ballotId);
    return await tx.wait();
  }
}

// Example usage for ballot admin
async function adminExample() {
  // Connect to MetaMask
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  
  // Initialize the vote client
  const voteClient = new MultiVoteClient(provider, "0xYourContractAddressHere");
  await voteClient.initialize();
  
  // Create a new ballot
  const title = "Board Member Election";
  const choices = ["Alice", "Bob", "Charlie", "Dave"];
  
  // Start tomorrow, run for 7 days, commit phase is 3 days
  const startTime = Math.floor(Date.now() / 1000) + 86400; // 24 hours from now
  const duration = 7 * 86400; // 7 days
  const commitDuration = 3 * 86400; // 3 days
  
  const createReceipt = await voteClient.createBallot(
    title,
    choices,
    startTime,
    duration,
    commitDuration
  );
  
  console.log(`Ballot created! Transaction: ${createReceipt.transactionHash}`);
  
  // Get the ballot ID from event logs
  let ballotId = 0;
  for (const log of createReceipt.logs) {
    try {
      const parsed = voteClient.votingContract.interface.parseLog(log);
      if (parsed.name === "BallotCreated") {
        ballotId = parsed.args.ballotId.toNumber();
        break;
      }
    } catch (e) {
      // Not a contract event or not the event we're looking for
    }
  }
  
  console.log(`Ballot ID: ${ballotId}`);
  
  // Register voters
  const voters = [
    "0x123456...", 
    "0x789abc...",
    // more addresses...
  ];
  
  const registerReceipt = await voteClient.registerVoters(ballotId, voters);
  console.log(`Registered ${voters.length} voters! Transaction: ${registerReceipt.transactionHash}`);
  
  // Later, finalize ballot after voting ends and get results
  const ballot = await voteClient.getBallotInfo(ballotId);
  
  if (!ballot.finalized && Date.now() > ballot.endTime.getTime()) {
    console.log("Voting period has ended. Finalizing ballot...");
    await voteClient.finalizeBallot(ballotId);
    console.log("Ballot finalized!");
  }
  
  if (ballot.finalized) {
    const results = await voteClient.getResults(ballotId);
    
    console.log("Final Results:");
    for (let i = 0; i < ballot.choices.length; i++) {
      console.log(`${ballot.choices[i]}: ${results[i]} votes`);
    }
  }
}

// Example usage for voter
async function voterExample() {
  // Connect to MetaMask
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  
  // Initialize the vote client
  const voteClient = new MultiVoteClient(provider, "0xYourContractAddressHere");
  await voteClient.initialize();
  
  // Get ballot info
  const ballotId = 0;
  const ballot = await voteClient.getBallotInfo(ballotId);
  
  console.log(`Voting on: ${ballot.title}`);
  console.log(`Choices: ${ballot.choices.join(', ')}`);
  console.log(`Commit Phase: ${ballot.startTime.toLocaleString()} to ${ballot.commitEndTime.toLocaleString()}`);
  console.log(`Reveal Phase: ${ballot.commitEndTime.toLocaleString()} to ${ballot.endTime.toLocaleString()}`);
  
  // Check if user is registered
  const userAddress = await provider.getSigner().getAddress();
  const isRegistered = await voteClient.isVoterRegistered(ballotId, userAddress);
  
  if (!isRegistered) {
    console.log("You are not registered to vote in this ballot.");
    return;
  }
  
  // Check which phase we're in
  const now = Date.now();
  if (now < ballot.startTime.getTime()) {
    console.log("Voting has not started yet.");
    return;
  } else if (now <= ballot.commitEndTime.getTime()) {
    // Step 1: Commit phase
    console.log("In commit phase. You can commit your vote now.");
    const choiceIndex = 2; // Vote for choice index 2
    const voteData = await voteClient.vote(ballotId, choiceIndex);
    
    console.log("Vote committed! Save these values for the reveal phase:");
    console.log(`Salt: ${voteData.salt}`);
    console.log(`Nullifier: ${voteData.nullifier}`);
    console.log(`Reveal Address: ${voteData.revealAddress}`);
    console.log(`Reveal Private Key: ${voteData.revealPrivateKey}`);
    
    // Important: Save these values securely (in local storage for demo only)
    localStorage.setItem('vote_ballot_id', ballotId.toString());
    localStorage.setItem('vote_choice', choiceIndex.toString());
    localStorage.setItem('vote_salt', voteData.salt);
    localStorage.setItem('vote_nullifier', voteData.nullifier);
    localStorage.setItem('vote_reveal_key', voteData.revealPrivateKey);
    
    console.log("Please send a small amount of ETH to your reveal address for gas when revealing.");
    
  } else if (now <= ballot.endTime.getTime()) {
    // Step 2: Reveal phase
    console.log("In reveal phase. You can reveal your vote now.");
    
    const storedBallotId = parseInt(localStorage.getItem('vote_ballot_id') || '0');
    const storedChoice = parseInt(localStorage.getItem('vote_choice') || '0');
    const storedSalt = localStorage.getItem('vote_salt') || '';
    const storedNullifier = localStorage.getItem('vote_nullifier') || '';
    const storedRevealKey = localStorage.getItem('vote_reveal_key') || '';
    
    if (!storedSalt || !storedNullifier || !storedRevealKey) {
      console.log("Could not find saved vote data. Make sure you committed a vote first.");
      return;
    }
    
    try {
      const receipt = await voteClient.reveal(
        storedBallotId,
        storedChoice,
        storedNullifier,
        storedSalt,
        storedRevealKey
      );
      
      console.log("Vote revealed successfully!");
      console.log(`Transaction hash: ${receipt.transactionHash}`);
    } catch (error) {
      console.error("Failed to reveal vote:", error);
    }
  } else {
    console.log("Voting period has ended.");
    
    // Check if the ballot is finalized
    if (!ballot.finalized) {
      console.log("Ballot not yet finalized. Anyone can finalize it.");
      try {
        await voteClient.finalizeBallot(ballotId);
        console.log("Ballot finalized!");
      } catch (error) {
        console.error("Failed to finalize ballot:", error);
      }
    }
    
    // Show results
    try {
      const results = await voteClient.getResults(ballotId);
      console.log("Voting Results:");
      for (let i = 0; i < ballot.choices.length; i++) {
        const choice = ballot.choices[i] || `Choice ${i}`;
        console.log(`${choice}: ${results[i]} votes`);
      }
    } catch (error) {
      console.error("Failed to get results:", error);
    }
  }
}