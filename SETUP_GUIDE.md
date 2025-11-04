# 🛠️ Complete Setup Guide

## Step-by-Step Installation

### 1️⃣ Install Prerequisites

#### Install Node.js
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# macOS
brew install node

# Windows
# Download from https://nodejs.org
```

#### Install MongoDB
```bash
# Ubuntu/Debian
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod

# macOS
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community

# Windows
# Download from https://www.mongodb.com/try/download/community
```

#### Install Rust (for Smart Contracts)
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
rustup target add wasm32-unknown-unknown
```

#### Install Soroban CLI
```bash
cargo install --locked soroban-cli --features opt
```

### 2️⃣ Create Project Structure
```bash
mkdir stellar-timelock-savings
cd stellar-timelock-savings
mkdir frontend backend contracts
```

### 3️⃣ Setup Frontend
```bash
cd frontend

# Create React app structure
mkdir -p src/services public

# Copy all frontend files from above
# - package.json
# - public/index.html
# - src/index.js
# - src/index.css
# - src/App.js
# - src/services/StellarService.js
# - .env

# Install dependencies
npm install
```

### 4️⃣ Setup Backend
```bash
cd ../backend

# Copy backend files
# - package.json
# - server.js
# - .env

# Install dependencies
npm install
```

### 5️⃣ Setup Smart Contract
```bash
cd ../contracts

# Copy contract files
# - Cargo.toml
# - src/lib.rs

# Create src directory
mkdir src

# Build contract
soroban contract build
```

### 6️⃣ Configure Stellar Testnet
```bash
# Add testnet configuration
soroban config network add --global testnet \
  --rpc-url https://soroban-testnet.stellar.org:443 \
  --network-passphrase "Test SDF Network ; September 2015"

# Generate identity
soroban config identity generate --global myidentity

# Fund with test XLM
soroban config identity fund myidentity --network testnet

# Deploy contract
cd contracts
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/timelock_contract.wasm \
  --source myidentity \
  --network testnet
```

### 7️⃣ Start Development Servers

#### Terminal 1 - MongoDB
```bash
sudo systemctl status mongod
# Should show "active (running)"
```

#### Terminal 2 - Backend
```bash
cd backend
npm run dev
# Should show: Server running on port 5000
```

#### Terminal 3 - Frontend
```bash
cd frontend
npm start
# Opens browser at http://localhost:3000
```

## ✅ Verification Checklist

- [ ] Node.js installed (`node --version`)
- [ ] MongoDB running (`sudo systemctl status mongod`)
- [ ] Rust installed (`rustc --version`)
- [ ] Soroban CLI installed (`soroban --version`)
- [ ] Frontend dependencies installed
- [ ] Backend dependencies installed
- [ ] Contract compiled successfully
- [ ] Backend server running on port 5000
- [ ] Frontend running on port 3000
- [ ] MongoDB accessible at localhost:27017

## 🐛 Common Issues

### Port Already in Use
```bash
# Kill process on port 3000
sudo lsof -t -i:3000 | xargs kill -9

# Kill process on port 5000
sudo lsof -t -i:5000 | xargs kill -9
```

### MongoDB Not Starting
```bash
# Check logs
sudo journalctl -u mongod

# Reset MongoDB
sudo systemctl stop mongod
sudo rm -rf /var/lib/mongodb/*
sudo systemctl start mongod
```

### Contract Build Fails
```bash
# Update Rust toolchain
rustup update stable

# Clean build
cd contracts
cargo clean
soroban contract build
```

### Stellar Connection Issues
- Ensure you're connected to internet
- Check testnet status: https://status.stellar.org
- Verify account is funded (use Friendbot)

## 📞 Get Help

If you encounter issues:
1. Check error messages carefully
2. Verify all prerequisites are installed
3. Ensure all ports are available
4. Check MongoDB is running
5. Review Stellar testnet status

Happy coding! 🚀