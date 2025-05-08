// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.17;

import "./verifiers/VoteCommitVerifier.sol";
import "./verifiers/VoteRevealVerifier.sol";

/**
 * @title MultiVote
 * @dev A private voting system with admin controls and voter registration
 */
contract MultiVote {
    // Groth16 verifiers for the vote proofs
    VoteCommitVerifier public commitVerifier;
    VoteRevealVerifier public revealVerifier;
    
    // Ballot information
    struct Ballot {
        string title;
        string[] choices;
        uint256 startTime;
        uint256 endTime;
        uint256 commitEndTime; // When the commit phase ends
        bool finalized;
        address admin;         // The creator/admin of the ballot
        bool hasRegisteredVoters; // Flag indicating if this ballot has a whitelist
        mapping(uint256 => uint256) results; // choice index => vote count
    }

    // Ballot storage
    mapping(uint256 => Ballot) public ballots;
    uint256 public ballotCount;

    // Voter registration
    mapping(uint256 => mapping(address => bool)) public registeredVoters; // ballotId => voter => isRegistered

    // Sets to track commitments and reveals
    mapping(uint256 => mapping(bytes32 => bool)) public commitments; // ballotId => commitment => exists
    mapping(uint256 => mapping(bytes32 => bool)) public nullifiers; // ballotId => nullifier => used

    // Events
    event BallotCreated(uint256 indexed ballotId, string title, address admin, uint256 startTime, uint256 endTime, uint256 commitEndTime);
    event VoterRegistered(uint256 indexed ballotId, address voter);
    event VotersRegistered(uint256 indexed ballotId, uint256 count);
    event VoteCommitted(bytes32 commitment, address indexed voter, uint256 indexed ballotId);
    event VoteRevealed(uint256 choice, address indexed voter, uint256 indexed ballotId);
    event BallotFinalized(uint256 indexed ballotId, uint256[] results);

    /**
     * @dev Constructor sets the verifier contracts
     * @param _commitVerifier Address of the Groth16 verifier for commitments
     * @param _revealVerifier Address of the Groth16 verifier for reveals
     */
    constructor(address _commitVerifier, address _revealVerifier) {
        commitVerifier = VoteCommitVerifier(_commitVerifier);
        revealVerifier = VoteRevealVerifier(_revealVerifier);
    }

    /**
     * @dev Create a new ballot
     * @param _title Title of the ballot
     * @param _choices Array of choices
     * @param _startTime When the ballot starts (must be in the future)
     * @param _duration Duration of the ballot in seconds
     * @param _commitDuration Duration of the commit phase in seconds
     */
    function createBallot(
        string memory _title,
        string[] memory _choices,
        uint256 _startTime,
        uint256 _duration,
        uint256 _commitDuration
    ) external {
        require(_choices.length > 1, "Need at least 2 choices");
        require(_startTime > block.timestamp, "Start time must be in the future");
        require(_commitDuration < _duration, "Commit phase must end before ballot ends");

        uint256 ballotId = ballotCount++;
        
        Ballot storage ballot = ballots[ballotId];
        ballot.title = _title;
        ballot.choices = _choices;
        ballot.startTime = _startTime;
        ballot.endTime = _startTime + _duration;
        ballot.commitEndTime = _startTime + _commitDuration;
        ballot.finalized = false;
        ballot.admin = msg.sender;
        ballot.hasRegisteredVoters = false;

        emit BallotCreated(ballotId, _title, msg.sender, ballot.startTime, ballot.endTime, ballot.commitEndTime);
    }

    /**
     * @dev Register voters for a ballot (admin only, before ballot starts)
     * @param _ballotId ID of the ballot
     * @param _voters Array of voter addresses to register
     */
    function registerVoters(uint256 _ballotId, address[] calldata _voters) external {
        Ballot storage ballot = ballots[_ballotId];
        
        require(msg.sender == ballot.admin, "Only admin can register voters");
        require(block.timestamp < ballot.startTime, "Ballot has already started");
        
        for (uint256 i = 0; i < _voters.length; i++) {
            registeredVoters[_ballotId][_voters[i]] = true;
        }
        
        ballot.hasRegisteredVoters = true;
        
        emit VotersRegistered(_ballotId, _voters.length);
    }

    /**
     * @dev Commit a vote
     * @param _ballotId ID of the ballot
     * @param _commitment Commitment hash containing choice, reveal address, and salt
     * @param _pA First part of the zk-SNARK proof
     * @param _pB Second part of the zk-SNARK proof
     * @param _pC Third part of the zk-SNARK proof
     */
    function commitVote(
        uint256 _ballotId,
        bytes32 _commitment,
        uint[2] memory _pA,
        uint[2][2] memory _pB,
        uint[2] memory _pC
    ) external {
        Ballot storage ballot = ballots[_ballotId];
        
        require(block.timestamp >= ballot.startTime, "Voting has not started");
        require(block.timestamp <= ballot.commitEndTime, "Commit phase has ended");
        require(!ballot.finalized, "Ballot is finalized");
        require(!commitments[_ballotId][_commitment], "Commitment already exists");
        
        // Check if voter is registered (if registration is required)
        if (ballot.hasRegisteredVoters) {
            require(registeredVoters[_ballotId][msg.sender], "Voter not registered");
        }

        // Verify the commitment proof
        require(commitVerifier.verifyProof(_pA, _pB, _pC, [uint256(_commitment)]), "Invalid commitment proof");
        
        // Store the commitment
        commitments[_ballotId][_commitment] = true;
        
        emit VoteCommitted(_commitment, msg.sender, _ballotId);
    }

    /**
     * @dev Reveal a vote
     * @param _ballotId ID of the ballot
     * @param _choice Vote choice index
     * @param _nullifier Unique nullifier to prevent double voting
     * @param _pA First part of the zk-SNARK proof
     * @param _pB Second part of the zk-SNARK proof
     * @param _pC Third part of the zk-SNARK proof
     */
    function revealVote(
        uint256 _ballotId,
        uint256 _choice,
        bytes32 _nullifier,
        uint[2] memory _pA,
        uint[2][2] memory _pB,
        uint[2] memory _pC
    ) external {
        Ballot storage ballot = ballots[_ballotId];
        
        require(block.timestamp > ballot.commitEndTime, "Commit phase not ended");
        require(block.timestamp <= ballot.endTime, "Voting has ended");
        require(!ballot.finalized, "Ballot is finalized");
        require(!nullifiers[_ballotId][_nullifier], "Nullifier already used");
        require(_choice < ballot.choices.length, "Invalid choice");
        
        // Verify the reveal proof
        require(revealVerifier.verifyProof(_pA, _pB, _pC, [_choice, uint256(_nullifier), uint256(uint160(msg.sender)), _ballotId]), "Invalid reveal proof");
        
        // Mark nullifier as used
        nullifiers[_ballotId][_nullifier] = true;
        
        // Update results
        ballot.results[_choice]++;
        
        emit VoteRevealed(_choice, msg.sender, _ballotId);
    }

    /**
     * @dev Finalize a ballot after voting ends
     * @param _ballotId ID of the ballot
     */
    function finalizeBallot(uint256 _ballotId) external {
        Ballot storage ballot = ballots[_ballotId];
        
        require(block.timestamp > ballot.endTime, "Voting has not ended");
        require(!ballot.finalized, "Ballot already finalized");
        
        ballot.finalized = true;
        
        // Collect results for the event
        uint256[] memory results = new uint256[](ballot.choices.length);
        for (uint256 i = 0; i < ballot.choices.length; i++) {
            results[i] = ballot.results[i];
        }
        
        emit BallotFinalized(_ballotId, results);
    }

    /**
     * @dev Get the results of a finalized ballot
     * @param _ballotId ID of the ballot
     * @return Array of vote counts for each choice
     */
    function getBallotResults(uint256 _ballotId) external view returns (uint256[] memory) {
        Ballot storage ballot = ballots[_ballotId];
        require(ballot.finalized, "Ballot not finalized");
        
        uint256[] memory results = new uint256[](ballot.choices.length);
        for (uint256 i = 0; i < ballot.choices.length; i++) {
            results[i] = ballot.results[i];
        }
        return results;
    }
}