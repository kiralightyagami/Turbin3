# ADV Task: Decentralized Freelance Platform with Reputation Staking

## Novel Use Case Overview

**DeWork Protocol** - A decentralized freelance marketplace that combines SPL tokens, Vault locking, and Escrow mechanisms to create a trustless platform where:
- Freelancers stake reputation tokens in Vaults to demonstrate commitment
- Clients fund project payments through milestone-based Escrows
- Reputation tokens are locked/unlocked based on project completion and reviews
- Automatic payment release occurs upon milestone verification


## User Story

### Actors
- **Alice** (Client) - Needs a web development project completed
- **Bob** (Freelancer) - A skilled developer looking for work
- **Protocol** - Smart contract system managing reputation and payments

### Scenario

**Setup Phase:**
1. Bob stakes 100 WORK tokens (reputation tokens) into a Vault to become a verified freelancer
2. His staked tokens remain locked during active projects, showing skin in the game
3. Alice posts a project worth 500 USDC equivalent in WORK tokens

**Engagement Phase:**
4. Alice creates an Escrow with 3 milestones:
   - Milestone 1: Design mockups (150 WORK tokens)
   - Milestone 2: Frontend implementation (200 WORK tokens)
   - Milestone 3: Backend + deployment (150 WORK tokens)
5. Alice funds the Escrow with 500 WORK tokens (locked until conditions met)

**Execution Phase:**
6. Bob completes Milestone 1 and submits deliverables
7. Alice verifies and approves Milestone 1
8. Escrow automatically releases 150 WORK tokens to Bob
9. Process repeats for Milestones 2 and 3

**Completion Phase:**
10. After all milestones complete, Alice rates Bob 5/5 stars
11. Bob's staked Vault tokens earn bonus rewards (10 WORK tokens)
12. Bob can now unlock his original 100 WORK stake + 10 bonus = 110 WORK tokens
13. Bob also earned 500 WORK tokens from the project

**Edge Case - Dispute:**
- If Alice disputes quality, a DAO vote mechanism uses locked Vault stakes as voting power
- If Bob is found in fault, 20% of his Vault stake goes to Alice as compensation
- If Alice is found acting in bad faith, Bob receives full payment + bonus from Alice's dispute deposit

---

## 🏗️ Architecture Diagram

![DeWork Protocol Architecture](adv.png)

### Architecture Overview

The diagram above illustrates the complete **DeWork Protocol** architecture, showing:

1. **Token Layer**: WORK token (SPL Token) as the foundation
2. **Vault System**: Reputation staking mechanism for freelancers
3. **Escrow System**: Milestone-based payment system for projects
4. **Data Flow**: Complete interaction between Alice (Client), Bob (Freelancer), and the protocol
5. **Security Mechanisms**: Multi-layered protection for both parties

