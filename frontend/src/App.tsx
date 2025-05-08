import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { MultiVoteClient } from './multivote-client';

interface Ballot {
  id: number;
  title: string;
  choices: string[];
  startTime: Date;
  endTime: Date;
  commitEndTime: Date;
  finalized: boolean;
  admin: string;
  hasRegisteredVoters: boolean;
}

interface VoteData {
  salt: string;
  nullifier: string;
  commitment: string;
  revealAddress: string;
  revealPrivateKey: string;
}

function App() {
  const [account, setAccount] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [client, setClient] = useState<MultiVoteClient | null>(null);
  const [contractAddress] = useState<string>('0x5FbDB2315678afecb367f032d93F642f64180aa3'); // Example address - replace with your actual deployed contract address
  const [ballots, setBallots] = useState<Ballot[]>([]);
  const [selectedBallotId, setSelectedBallotId] = useState<number | null>(null);
  const [selectedBallot, setSelectedBallot] = useState<Ballot | null>(null);
  const [isRegistered, setIsRegistered] = useState<boolean>(false);
  const [voterData, setVoterData] = useState<VoteData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [phase, setPhase] = useState<'not-started' | 'commit' | 'reveal' | 'ended'>('not-started');
  const [results, setResults] = useState<number[]>([]);
  const [selectedChoice, setSelectedChoice] = useState<number>(0);
  const [zkFilesWarning] = useState<string>(
    "Note: This demo requires compiled circuit files (.wasm and .zkey) " +
    "which need to be generated using 'npm run generate-verifiers' from the root directory. " +
    "Without these files, ZK proof generation will fail."
  );

  // Load ballots (dummy implementation - would need to be replaced with real data)
  const loadBallots = useCallback(async () => {
    try {
      setLoading(true);
      
      // This is a placeholder - in a real implementation you would:
      // 1. Query the blockchain for BallotCreated events 
      // 2. Get ballot details for each ID
      // For now we'll simulate with a sample ballot
      
      const sampleBallots: Ballot[] = [
        {
          id: 0,
          title: 'Board Member Election',
          choices: ['Alice', 'Bob', 'Charlie', 'Dave'],
          startTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          commitEndTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day from now
          endTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
          finalized: false,
          admin: account,
          hasRegisteredVoters: true
        }
      ];
      
      setBallots(sampleBallots);
      setLoading(false);
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'Failed to load ballots');
    }
  }, [account]);

  // Initialize client
  const initializeClient = useCallback(async () => {
    try {
      setError('');
      setLoading(true);
      
      if (!ethers.utils.isAddress(contractAddress)) {
        throw new Error('Contract address is not valid');
      }
      
      if (!window.ethereum) {
        throw new Error('MetaMask not detected. Please install MetaMask first.');
      }
      
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const newClient = new MultiVoteClient(provider, contractAddress);
      await newClient.initialize();
      
      setClient(newClient);
      setLoading(false);
      setSuccess('Client initialized successfully!');
      
      // Load some sample ballots (in a real app, you'd fetch these from events)
      await loadBallots();
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'Failed to initialize client');
    }
  }, [contractAddress, loadBallots]);

  // Auto-initialize client after wallet connection
  useEffect(() => {
    if (isConnected && !client) {
      initializeClient();
    }
  }, [isConnected, client, initializeClient]);

  // Connect to Ethereum wallet
  const connectWallet = async () => {
    try {
      setError('');
      setLoading(true);
      
      if (!window.ethereum) {
        throw new Error('MetaMask not detected. Please install MetaMask to use this application.');
      }
      
      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const selectedAccount = accounts[0];
      setAccount(selectedAccount);
      setIsConnected(true);
      
      // Setup provider
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      
      setLoading(false);
      setSuccess('Wallet connected successfully!');
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'Failed to connect wallet');
    }
  };

  // Select a ballot to view/vote
  const selectBallot = async (id: number) => {
    try {
      setLoading(true);
      setError('');
      setSelectedBallotId(id);
      
      const ballot = ballots.find(b => b.id === id);
      if (!ballot) {
        throw new Error('Ballot not found');
      }
      
      setSelectedBallot(ballot);
      
      // Check if user is registered for this ballot
      if (client && account) {
        const registered = await client.isVoterRegistered(id, account);
        setIsRegistered(registered);
      }
      
      // Determine current phase
      const now = new Date();
      if (now < ballot.startTime) {
        setPhase('not-started');
      } else if (now <= ballot.commitEndTime) {
        setPhase('commit');
      } else if (now <= ballot.endTime) {
        setPhase('reveal');
      } else {
        setPhase('ended');
      }
      
      // Load results if finalized
      if (ballot.finalized && client) {
        const ballotResults = await client.getResults(id);
        setResults(ballotResults);
      }
      
      setLoading(false);
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'Failed to load ballot details');
    }
  };

  // Commit a vote
  const commitVote = async () => {
    if (!client || !selectedBallotId || selectedChoice === undefined) {
      setError('Missing required information to vote');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      const voteResult = await client.vote(selectedBallotId, selectedChoice);
      
      setVoterData({
        salt: voteResult.salt,
        nullifier: voteResult.nullifier,
        commitment: voteResult.commitment,
        revealAddress: voteResult.revealAddress,
        revealPrivateKey: voteResult.revealPrivateKey
      });
      
      // Save to localStorage for demo purposes (in a real app, use secure storage)
      localStorage.setItem('vote_ballot_id', selectedBallotId.toString());
      localStorage.setItem('vote_choice', selectedChoice.toString());
      localStorage.setItem('vote_salt', voteResult.salt);
      localStorage.setItem('vote_nullifier', voteResult.nullifier);
      localStorage.setItem('vote_reveal_key', voteResult.revealPrivateKey);
      
      setLoading(false);
      setSuccess('Vote committed successfully! Save your reveal information.');
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'Failed to commit vote');
    }
  };

  // Reveal a vote
  const revealVote = async () => {
    if (!client || !selectedBallotId) {
      setError('Client not initialized or ballot not selected');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      // Get stored vote data
      const storedBallotId = parseInt(localStorage.getItem('vote_ballot_id') || '0');
      const storedChoice = parseInt(localStorage.getItem('vote_choice') || '0');
      const storedSalt = localStorage.getItem('vote_salt') || '';
      const storedNullifier = localStorage.getItem('vote_nullifier') || '';
      const storedRevealKey = localStorage.getItem('vote_reveal_key') || '';
      
      if (!storedSalt || !storedNullifier || !storedRevealKey) {
        throw new Error('Could not find saved vote data. Make sure you committed a vote first.');
      }
      
      const receipt = await client.reveal(
        storedBallotId,
        storedChoice,
        storedNullifier,
        storedSalt,
        storedRevealKey
      );
      
      setLoading(false);
      setSuccess(`Vote revealed successfully! Transaction hash: ${receipt.transactionHash}`);
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'Failed to reveal vote');
    }
  };

  // Finalize a ballot
  const finalizeBallot = async () => {
    if (!client || !selectedBallotId) {
      setError('Client not initialized or ballot not selected');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      const receipt = await client.finalizeBallot(selectedBallotId);
      
      // Update local ballot state
      if (selectedBallot) {
        const updatedBallot = { ...selectedBallot, finalized: true };
        setSelectedBallot(updatedBallot);
        
        // Update the ballots list
        const updatedBallots = ballots.map(b => 
          b.id === selectedBallotId ? updatedBallot : b
        );
        setBallots(updatedBallots);
        
        // Load results
        const results = await client.getResults(selectedBallotId);
        setResults(results);
      }
      
      setLoading(false);
      setSuccess(`Ballot finalized successfully! Transaction hash: ${receipt.transactionHash}`);
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'Failed to finalize ballot');
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h1>MultiVote ZK Voting</h1>
        <p>Connect your wallet and interact with the MultiVote contract to participate in private voting.</p>
        
        <div className="error" style={{ marginBottom: '20px' }}>
          <strong>⚠️ Development Note:</strong> {zkFilesWarning}
        </div>
        
        {!isConnected ? (
          <button onClick={connectWallet} disabled={loading}>
            {loading ? 'Connecting...' : 'Connect Wallet'}
          </button>
        ) : (
          <p>Connected: {account}</p>
        )}
        
        {client && (
          <div>
            {/* Ballot Selection */}
            <h2>Available Ballots</h2>
            {ballots.length === 0 ? (
              <p>No ballots found.</p>
            ) : (
              <div className="ballot-list">
                {ballots.map(ballot => (
                  <div key={ballot.id} className="card" onClick={() => selectBallot(ballot.id)}>
                    <h3>{ballot.title}</h3>
                    <p>Status: {ballot.finalized ? 'Finalized' : 'Active'}</p>
                    <button>Select</button>
                  </div>
                ))}
              </div>
            )}
            
            {/* Selected Ballot Information */}
            {selectedBallot && (
              <div className="card">
                <h2>Ballot: {selectedBallot.title}</h2>
                
                <div className={`phase-indicator phase-${phase}`}>
                  Current Phase: {phase === 'not-started' ? 'Not Started' : 
                                  phase === 'commit' ? 'Commit Phase' : 
                                  phase === 'reveal' ? 'Reveal Phase' : 'Ended'}
                </div>
                
                <p>Registered: {isRegistered ? 'Yes' : 'No'}</p>
                
                <p>Commit Phase: {selectedBallot.startTime.toLocaleString()} to {selectedBallot.commitEndTime.toLocaleString()}</p>
                <p>Reveal Phase: {selectedBallot.commitEndTime.toLocaleString()} to {selectedBallot.endTime.toLocaleString()}</p>
                
                <h3>Choices:</h3>
                <ul>
                  {selectedBallot.choices.map((choice, index) => (
                    <li key={index}>{choice}</li>
                  ))}
                </ul>
                
                {/* Voting Commit Form */}
                {phase === 'commit' && isRegistered && (
                  <div>
                    <h3>Cast Your Vote</h3>
                    <select value={selectedChoice} onChange={(e) => setSelectedChoice(parseInt(e.target.value))}>
                      {selectedBallot.choices.map((choice, index) => (
                        <option key={index} value={index}>{choice}</option>
                      ))}
                    </select>
                    <button onClick={commitVote} disabled={loading}>
                      {loading ? 'Committing...' : 'Commit Vote'}
                    </button>
                  </div>
                )}
                
                {/* Vote Reveal Form */}
                {phase === 'reveal' && (
                  <div>
                    <h3>Reveal Your Vote</h3>
                    <p>This will use the stored vote data from your commit.</p>
                    <button onClick={revealVote} disabled={loading}>
                      {loading ? 'Revealing...' : 'Reveal Vote'}
                    </button>
                  </div>
                )}
                
                {/* Finalize Button */}
                {phase === 'ended' && !selectedBallot.finalized && (
                  <div>
                    <h3>Finalize Ballot</h3>
                    <p>Voting period has ended. Finalize to see results.</p>
                    <button onClick={finalizeBallot} disabled={loading}>
                      {loading ? 'Finalizing...' : 'Finalize Ballot'}
                    </button>
                  </div>
                )}
                
                {/* Results Section */}
                {selectedBallot.finalized && results.length > 0 && (
                  <div>
                    <h3>Results</h3>
                    <ul>
                      {results.map((count, index) => (
                        <li key={index}>
                          {selectedBallot.choices[index]}: {count} votes
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            
            {/* Voter Secret Data - Only show after commitment */}
            {voterData && (
              <div className="card">
                <h2>Your Vote Secret Information</h2>
                <p className="error">⚠️ IMPORTANT: Save this information securely to reveal your vote later!</p>
                <pre style={{ overflow: 'auto', background: '#f0f0f0', padding: '10px' }}>
                  {JSON.stringify(voterData, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
        
        {/* Error and Success Messages */}
        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}
      </div>
    </div>
  );
}

export default App; 