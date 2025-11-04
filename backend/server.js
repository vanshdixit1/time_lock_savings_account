const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/stellar-timelock', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Account Schema
const accountSchema = new mongoose.Schema({
  walletAddress: { type: String, required: true },
  amount: { type: Number, required: true },
  lockPeriod: { type: Number, required: true },
  interest: { type: Number, required: true },
  unlockTime: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['locked', 'withdrawn'], default: 'locked' },
  txHash: { type: String, required: true }
});

const Account = mongoose.model('Account', accountSchema);

// Routes

// Get all accounts
app.get('/api/accounts', async (req, res) => {
  try {
    const accounts = await Account.find().sort({ createdAt: -1 });
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get account by ID
app.get('/api/accounts/:id', async (req, res) => {
  try {
    const account = await Account.findById(req.params.id);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    res.json(account);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new account
app.post('/api/accounts', async (req, res) => {
  try {
    const { walletAddress, amount, lockPeriod, interest, txHash } = req.body;
    
    // Calculate unlock time
    const unlockTime = new Date();
    unlockTime.setDate(unlockTime.getDate() + lockPeriod);
    
    const account = new Account({
      walletAddress,
      amount,
      lockPeriod,
      interest,
      unlockTime,
      txHash
    });
    
    await account.save();
    res.status(201).json(account);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Withdraw from account
app.patch('/api/accounts/:id/withdraw', async (req, res) => {
  try {
    const account = await Account.findById(req.params.id);
    
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    if (account.status === 'withdrawn') {
      return res.status(400).json({ error: 'Already withdrawn' });
    }
    
    if (new Date() < account.unlockTime) {
      return res.status(400).json({ error: 'Cannot withdraw before unlock time' });
    }
    
    account.status = 'withdrawn';
    await account.save();
    
    res.json(account);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get accounts by wallet address
app.get('/api/accounts/wallet/:address', async (req, res) => {
  try {
    const accounts = await Account.find({ 
      walletAddress: req.params.address 
    }).sort({ createdAt: -1 });
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get statistics
app.get('/api/stats', async (req, res) => {
  try {
    const totalAccounts = await Account.countDocuments();
    const activeAccounts = await Account.countDocuments({ status: 'locked' });
    
    const totalLocked = await Account.aggregate([
      { $match: { status: 'locked' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const totalInterest = await Account.aggregate([
      { $group: { _id: null, total: { $sum: '$interest' } } }
    ]);
    
    res.json({
      totalAccounts,
      activeAccounts,
      totalLocked: totalLocked[0]?.total || 0,
      totalInterest: totalInterest[0]?.total || 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});