# 🌟 Stellar Time-Lock Savings Account

A decentralized savings application where users can lock XLM tokens for a specific period and earn guaranteed interest rewards.

## ✨ Features

- 🔒 **Time-Locked Savings**: Lock XLM for 30, 60, 90, or 180 days
- 💰 **Guaranteed Interest**: Earn 5-18% APY based on lock period
- 📊 **Real-Time Dashboard**: Track savings progress with live countdown
- ⛓️ **Blockchain Secured**: Built on Stellar with Soroban smart contracts
- 🚫 **No Early Withdrawal**: Funds automatically released after lock period

## 🏗️ Architecture
```
┌─────────────┐      ┌─────────────┐      ┌──────────────┐
│   React     │─────▶│   Node.js   │─────▶│   MongoDB    │
│  Frontend   │      │   Backend   │      │   Database   │
└─────────────┘      └─────────────┘      └──────────────┘
       │                                           
       │                                           
       ▼                                           
┌─────────────────────────────────────────────────┐
│         Stellar Blockchain + Soroban            │
│              (Smart Contracts)                  │
└─────────────────────────────────────────────────┘
```
<img width="1918" height="1018" alt="image" src="https://github.com/user-attachments/assets/850cd14d-24cb-4a18-958e-b26b9d35c7a8" />


<img width="1918" height="1021" alt="image" src="https://github.com/user-attachments/assets/a0b7aa49-2837-44f8-aed1-c68536880615" />


<img width="1918" height="1017" alt="image" src="https://github.com/user-attachments/assets/9f6a236a-fa8f-4c2d-8dac-73cdb1d3e18a" />


## 📲 Mobile View

<img width="1918" height="1013" alt="image" src="https://github.com/user-attachments/assets/68ac2987-e881-45fb-940e-bfdc540eea6c" />


<img width="1918" height="1016" alt="image" src="https://github.com/user-attachments/assets/e2263d06-e8c1-461c-aeef-fc3389bc1968" />

## 🎬 Demo Video
🎥 [Watch the demo on Google Drive](https://drive.google.com/file/d/1XtT5CMC-QJ9KsRP5dvDOC6aONmgmnO-y/view?usp=sharing) 

## 📋 Prerequisites

- Node.js v16+ and npm
- MongoDB v4+
- Rust (for Soroban contracts)
- Stellar CLI (soroban-cli)

## 🚀 Installation

### 1. Clone the Repository
```bash
mkdir stellar-timelock-savings
cd stellar-timelock-savings
```

### 2. Setup Frontend
```bash
cd frontend
npm install
```

### 3. Setup Backend
```bash
cd ../backend
npm install
```

### 4. Setup Smart Contract
```bash
cd ../contracts

# Install Rust (if not installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Add wasm target
rustup target add wasm32-unknown-unknown

# Install Soroban CLI
cargo install --locked soroban-cli

# Build contract
soroban contract build
```

## ⚙️ Configuration

### Frontend (.env)
Create `frontend/.env`:
```env
REACT_APP_API_URL=http://localhost:5000/api
```

### Backend (.env)
Create `backend/.env`:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/stellar-timelock
NODE_ENV=development
```

## 🎯 Running the Application

### 1. Start MongoDB
```bash
# Using MongoDB service
sudo systemctl start mongod

# OR using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### 2. Start Backend
```bash
cd backend
npm run dev
```

### 3. Start Frontend
```bash
cd frontend
npm start
```

The app will open at `http://localhost:3000`

## 🔐 Deploying Smart Contract to Stellar Testnet
```bash
cd contracts

# Configure Stellar CLI for testnet
soroban config network add --global testnet \
  --rpc-url https://soroban-testnet.stellar.org:443 \
  --network-passphrase "Test SDF Network ; September 2015"

# Create identity
soroban config identity generate --global alice

# Fund account (get test XLM)
soroban config identity fund alice --network testnet

# Deploy contract
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/timelock_contract.wasm \
  --source alice \
  --network testnet

# Save the contract ID that's returned
```

## 📱 Usage Guide

### Creating a Time-Lock Account

1. Get a Stellar wallet (use [Stellar Laboratory](https://laboratory.stellar.org))
2. Fund your testnet account from [Stellar Friendbot](https://friendbot.stellar.org)
3. Enter your public key and secret key
4. Choose amount and lock period
5. Click "Create Lock & Earn Interest"

### Withdrawing Funds

1. Go to "My Accounts" tab
2. Wait for countdown to reach zero
3. Click "Withdraw" button
4. Enter your secret key
5. Funds + interest transferred to your wallet

## 🧪 Testing Smart Contract
```bash
cd contracts
cargo test
```

## 📊 API Endpoints

### GET `/api/accounts`
Get all time-lock accounts

### POST `/api/accounts`
Create new time-lock account
```json
{
  "walletAddress": "GXXX...",
  "amount": 100,
  "lockPeriod": 30,
  "interest": 5,
  "txHash": "abc123..."
}
```

### PATCH `/api/accounts/:id/withdraw`
Withdraw from account (after unlock time)

### GET `/api/stats`
Get platform statistics

## 🎨 Tech Stack

- **Frontend**: React, Tailwind CSS, Stellar SDK, Axios
- **Backend**: Node.js, Express, MongoDB, Mongoose
- **Blockchain**: Stellar, Soroban (Rust)
- **Testing**: Jest, Cargo Test

## 📈 Interest Rates

| Lock Period | APY  |
|-------------|------|
| 30 Days     | 5%   |
| 60 Days     | 8%   |
| 90 Days     | 12%  |
| 180 Days    | 18%  |

## 🔧 Troubleshooting

### MongoDB Connection Error
```bash
# Check if MongoDB is running
sudo systemctl status mongod

# Start MongoDB
sudo systemctl start mongod
```

### Stellar Transaction Failed
- Ensure you're using testnet with funded account
- Check network connection
- Verify secret key is correct

### Contract Build Error
```bash
# Update Rust
rustup update

# Clean and rebuild
cargo clean
soroban contract build
```

## 🚦 Project Status

- ✅ Frontend UI Complete
- ✅ Backend API Complete
- ✅ Smart Contract Complete
- ✅ MongoDB Integration
- ✅ Stellar SDK Integration

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

## 📄 License

MIT License - feel free to use for learning and projects!

## 🆘 Support

For issues and questions:
- Create an issue on GitHub
- Check Stellar documentation: https://developers.stellar.org
- Soroban docs: https://soroban.stellar.org

## 🎓 Learning Resources

- [Stellar Basics](https://developers.stellar.org/docs/)
- [Soroban Smart Contracts](https://soroban.stellar.org/docs)
- [React Documentation](https://react.dev)
- [MongoDB Guide](https://www.mongodb.com/docs/)

---

Built with ❤️ using Stellar Blockchain
