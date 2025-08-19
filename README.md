# NewsPledge

A decentralized crowdfunding platform for independent journalism, enabling journalists to fund investigative projects through community support, with transparent fund allocation and reader-driven content prioritization.

---

## Overview

NewsPledge leverages blockchain technology to create a transparent, trustless ecosystem for independent journalism. It allows journalists to pitch investigative stories, crowdfund them with community backing, and distribute content securely, while readers influence what gets investigated through token-based voting. The platform consists of five main smart contracts built using Clarity:

1. **Journalist Token Contract** – Issues and manages journalist-specific tokens for funding and voting.
2. **Crowdfunding Campaign Contract** – Handles story pitch submissions and crowdfunding campaigns.
3. **Content Voting Contract** – Enables token holders to vote on proposed stories.
4. **Revenue Distribution Contract** – Distributes funds from campaigns and subscriptions to journalists.
5. **Oracle Integration Contract** – Verifies off-chain milestones (e.g., story publication) for fund releases.

---

## Features

- **Journalist tokens** for staking and community support  
- **Crowdfunding campaigns** for investigative story pitches  
- **Community voting** to prioritize stories  
- **Transparent revenue sharing** for published content and subscriptions  
- **Milestone-based fund releases** to ensure accountability  
- **Secure off-chain data integration** for verifying deliverables  

---

## Smart Contracts

### Journalist Token Contract
- Mint and transfer journalist-specific tokens
- Staking for campaign eligibility and voting power
- Burn mechanism for token supply control

### Crowdfunding Campaign Contract
- Create and manage story pitch campaigns
- Accept token pledges with refund conditions
- Campaign expiration and success thresholds

### Content Voting Contract
- Token-weighted voting on story pitches
- Proposal submission and voting periods
- Automated execution of approved campaigns

### Revenue Distribution Contract
- Distribute crowdfunded pledges upon milestone completion
- Handle subscription revenue splits for published content
- Transparent payout logs

### Oracle Integration Contract
- Connect to off-chain data for milestone verification (e.g., article publication)
- Securely trigger fund releases
- Maintain transparency for external data inputs

---

## Installation

1. Install [Clarinet CLI](https://docs.hiro.so/clarinet/getting-started)
2. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/newpledge.git
   ```
3. Run tests:
    ```bash
    npm test
    ```
4. Deploy contracts:
    ```bash
    clarinet deploy
    ```

## Usage

Each smart contract is designed to work independently while integrating with others to form the NewsPledge ecosystem. Refer to individual contract documentation for detailed function calls, parameters, and usage examples.

## License

MIT License
