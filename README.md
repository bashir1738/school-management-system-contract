# School Management System

Smart contracts for managing school operations on-chain: teachers, students, grades, and fee payments.

## Overview

Three core contracts:
- **HybitToken (ERC20)**: Native utility token (HBT) for fee payments
- **Teachers**: Manages faculty, attendance, grades, and assignments
- **Students**: Handles enrollment, fees (ETH or HBT), and academic records

## Setup & Commands

**Install dependencies:**
```bash
npm install
```

**Available commands:**

| Task | Command |
| :--- | :--- |
| Compile | `npm run compile` |
| Test | `npm run test` |
| Deploy (Local) | `npm run deploy:local` |
| Deploy (Sepolia) | `npm run deploy:sepolia` |
| Verify (Sepolia) | `npm run verify:sepolia` |

## Tech Stack

Solidity `^0.8.28` • Hardhat • Ethers.js • Networks: Local, Sepolia, Mainnet
