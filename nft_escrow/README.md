# NFT Escrow Program

A Solana program for secure NFT-to-NFT swaps using an escrow mechanism. This program enables trustless trading of NFTs between parties without requiring them to trust each other.

## Overview

The NFT Escrow program allows two parties to swap NFTs securely:
1. **Maker** creates an escrow and deposits their NFT
2. **Taker** accepts the escrow and deposits their NFT
3. **Complete** swaps both NFTs atomically
4. **Cancel** allows the maker to retrieve their NFT if the taker hasn't accepted

## Building and Testing

```bash
# Build the program
anchor build

# Run tests
anchor test
```

## Example Transactions

Here are example transactions from successful test runs on devnet:

### Initialize Escrow
- **Transaction:** [333SuigPU6nxND8jfbRRArJv7TA3DisrZooD3eALLigPSw1bzcBkcCNjzawFSxtu7z9PGhzJxS2tVeYZPYn431WU](https://explorer.solana.com/tx/333SuigPU6nxND8jfbRRArJv7TA3DisrZooD3eALLigPSw1bzcBkcCNjzawFSxtu7z9PGhzJxS2tVeYZPYn431WU?cluster=devnet)
- **Description:** Maker creates an escrow and deposits their NFT

### Accept Escrow
- **Transaction:** [23HRKEmyoKMkqgatK3DNuNEbobY55o3tmFahEhiTStjFvncmgzusnY7WNgXywS3PRdYoUiMGWoxSZpNdmQykkj5M](https://explorer.solana.com/tx/23HRKEmyoKMkqgatK3DNuNEbobY55o3tmFahEhiTStjFvncmgzusnY7WNgXywS3PRdYoUiMGWoxSZpNdmQykkj5M?cluster=devnet)
- **Description:** Taker accepts the escrow and deposits their NFT

### Complete Escrow
- **Transaction:** [3o4h3Dfe1yzGqima1wkvVLvJAK6713dDkJasJzbewpoPP4KrRJPwvgdGmnf8iuiLwuQTGBGbFyLZzzGoCsLc5AmR](https://explorer.solana.com/tx/3o4h3Dfe1yzGqima1wkvVLvJAK6713dDkJasJzbewpoPP4KrRJPwvgdGmnf8iuiLwuQTGBGbFyLZzzGoCsLc5AmR?cluster=devnet)
- **Description:** Complete the swap - both NFTs are transferred to their new owners

### Cancel Escrow
- **Transaction:** [42Ur8Ko4oXKgjGDxoF7KbKjZLSWCJYKqkYum8Rjyfx6jqtos4oL9KaHA37dmRx5KS6hV228uUVwVT8tvjEbjhJ6X](https://explorer.solana.com/tx/42Ur8Ko4oXKgjGDxoF7KbKjZLSWCJYKqkYum8Rjyfx6jqtos4oL9KaHA37dmRx5KS6hV228uUVwVT8tvjEbjhJ6X?cluster=devnet)
- **Description:** Maker cancels the escrow before taker accepts, NFT is returned to maker

## Problems with Direct NFT Trading (Discord/Manual Trading)

### 1. **Trust Issues - No Guarantee of Reciprocity**
**Problem:** When trading NFTs directly via Discord or manual transfers, there's no guarantee that both parties will fulfill their end of the trade. One party might send their NFT but never receive the other party's NFT in return.

**Example Scenario:**
- Jeff sends her NFT to Andrew's wallet
- Andrew never sends his NFT to Jeff
- Jeff has no recourse and loses her NFT

### 2. **No Atomic Swaps**
**Problem:** Direct transfers require two separate transactions. If one transaction succeeds and the other fails, one party is left at a disadvantage.

**Example Scenario:**
- Jeff transfers NFT to Bri (Transaction 1 succeeds)
- Bri tries to transfer NFT to Jeff (Transaction 2 fails due to network issues)
- Bri now has both NFTs, Jeff has none

### 3. **No Escrow Protection**
**Problem:** There's no neutral third party or smart contract holding the assets until both parties agree to complete the trade.

**Example Scenario:**
- No way to verify that both NFTs are available before the swap
- No way to ensure both transfers happen simultaneously
- No protection if one party changes their mind mid-trade

### 4. **Identity Verification Issues**
**Problem:** On Discord or other platforms, it's difficult to verify wallet ownership and prevent scams.

**Example Scenario:**
- Scammer creates fake Discord account
- Claims to own a valuable NFT
- Receives NFT from victim but never sends their promised NFT
- No way to verify identity or hold accountable

### 5. **No Dispute Resolution**
**Problem:** If something goes wrong, there's no mechanism for dispute resolution or refunds.

**Example Scenario:**
- Trade goes wrong
- No smart contract to enforce terms
- No way to automatically return assets
- Requires manual intervention and trust

### 6. **Timing and Coordination Issues**
**Problem:** Both parties must be online and coordinate the exact timing of transfers.

### 7. **No Trade History or Transparency**
**Problem:** Direct transfers don't create a verifiable record of trade agreements or terms.

**Example Scenario:**
- No on-chain record of trade agreement
- No way to prove what was agreed upon
- Difficult to track trade history

## Solution: NFT Escrow Program

The NFT Escrow program solves all these problems by providing:

### 1. **Trustless Trading**
- Both NFTs are held in escrow by the program (PDA)
- Neither party can access the other's NFT until both agree
- Smart contract enforces the trade terms automatically

### 2. **Atomic Swaps**
- The `complete` instruction ensures both NFTs are transferred simultaneously
- Either both transfers succeed or both fail (atomicity)
- No partial completion possible

### 3. **Escrow Protection**
- NFTs are held in a Program Derived Address (PDA)
- Only the program can release the NFTs
- Both parties must agree before completion

### 4. **On-Chain Verification**
- All parties and NFTs are verified on-chain
- No need to trust Discord usernames or external platforms
- Wallet addresses are cryptographically verifiable

### 5. **Automatic Dispute Resolution**
- Maker can cancel if taker doesn't accept (before acceptance)
- Once accepted, both parties are committed
- Smart contract enforces rules automatically

### 6. **Asynchronous Trading**
- Maker can create escrow and go offline
- Taker can accept when ready
- No need for both parties to be online simultaneously
- Trade can be completed later by either party

### 7. **Transparent Trade History**
- All escrow actions are recorded on-chain
- Verifiable transaction history
- Public and auditable

## How It Works

1. **Maker creates escrow:**
   - Transfers their NFT to the escrow PDA
   - Calls `initialize` to create escrow state
   - Specifies taker's wallet address

2. **Taker accepts escrow:**
   - Transfers their NFT to the escrow PDA
   - Calls `accept` to deposit their NFT
   - Escrow state is updated to show acceptance

3. **Complete the swap:**
   - Either party (or both) can call `complete`
   - Program transfers maker's NFT to taker
   - Program transfers taker's NFT to maker
   - Escrow is marked as completed

4. **Cancel (if needed):**
   - Maker can call `cancel` before taker accepts
   - NFT is returned to maker
   - Escrow is closed

## Security Features

- **PDA-based escrow:** NFTs are held in a Program Derived Address that only the program can control
- **State verification:** All instructions verify the escrow state before execution
- **Atomic operations:** Complete instruction ensures both transfers happen together
- **Access control:** Only authorized parties can interact with their escrows

## Enhancements

- Integration with Metaplex Core for on-chain NFT transfers
- Support for multi-NFT swaps
- Time-based expiration for escrows
- Fee mechanism for escrow service
- Integration with marketplaces and trading platforms

