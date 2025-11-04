import React, { useState, useEffect } from 'react';
import { Clock, Lock, Unlock, TrendingUp, Wallet, AlertCircle } from 'lucide-react';
import axios from 'axios';
import StellarService from './services/StellarService';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function App() {
  const [accounts, setAccounts] = useState([]);
  const [activeTab, setActiveTab] = useState('create');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    amount: '',
    lockPeriod: '30',
    walletAddress: '',
    secretKey: ''
  });
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    loadAccounts();
    return () => clearInterval(timer);
  }, []);

  const interestRates = {
    '30': 5,
    '60': 8,
    '90': 12,
    '180': 18
  };

  const calculateInterest = (amount, days) => {
    const rate = interestRates[days] || 5;
    return (amount * rate) / 100;
  };

  const loadAccounts = async () => {
    try {
      const response = await axios.get(`${API_URL}/accounts`);
      setAccounts(response.data);
    } catch (err) {
      console.error('Error loading accounts:', err);
    }
  };

  const createAccount = async () => {
    if (!formData.amount || !formData.walletAddress || !formData.secretKey) {
      setError('Please fill all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const amount = parseFloat(formData.amount);
      const lockPeriod = parseInt(formData.lockPeriod);
      const interest = calculateInterest(amount, lockPeriod);

      // Create account on blockchain
      const txHash = await StellarService.createTimeLock(
        formData.secretKey,
        amount,
        lockPeriod
      );

      // Save to backend
      const response = await axios.post(`${API_URL}/accounts`, {
        walletAddress: formData.walletAddress,
        amount,
        lockPeriod,
        interest,
        txHash
      });

      setAccounts([...accounts, response.data]);
      setFormData({ amount: '', lockPeriod: '30', walletAddress: '', secretKey: '' });
      setActiveTab('dashboard');
      alert('Account created successfully!');
    } catch (err) {
      setError(err.message || 'Error creating account');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const withdrawAccount = async (id) => {
    const account = accounts.find(a => a._id === id);
    if (!account) return;

    if (currentTime < new Date(account.unlockTime).getTime()) {
      alert('Cannot withdraw before unlock time!');
      return;
    }

    setLoading(true);
    try {
      // Withdraw from blockchain
      const secretKey = prompt('Enter your secret key to withdraw:');
      if (!secretKey) {
        setLoading(false);
        return;
      }

      await StellarService.withdraw(secretKey, account.amount + account.interest);

      // Update backend
      await axios.patch(`${API_URL}/accounts/${id}/withdraw`);
      
      await loadAccounts();
      alert(`Successfully withdrawn ${(account.amount + account.interest).toFixed(2)} XLM!`);
    } catch (err) {
      alert(err.message || 'Error withdrawing funds');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTimeRemaining = (unlockTime) => {
    const diff = new Date(unlockTime).getTime() - currentTime;
    if (diff <= 0) return 'Unlocked';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  };

  const totalLocked = accounts
    .filter(a => a.status === 'locked')
    .reduce((sum, a) => sum + a.amount, 0);

  const totalInterest = accounts
    .reduce((sum, a) => sum + a.interest, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Lock className="w-12 h-12 text-purple-400" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Stellar Time-Lock Savings
            </h1>
          </div>
          <p className="text-gray-300">Lock your XLM and earn guaranteed interest</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-br from-purple-800/50 to-purple-900/50 backdrop-blur-sm p-6 rounded-xl border border-purple-500/30">
            <div className="flex items-center gap-3 mb-2">
              <Wallet className="w-6 h-6 text-purple-400" />
              <span className="text-gray-400 text-sm">Total Locked</span>
            </div>
            <div className="text-3xl font-bold">{totalLocked.toFixed(2)} XLM</div>
          </div>

          <div className="bg-gradient-to-br from-blue-800/50 to-blue-900/50 backdrop-blur-sm p-6 rounded-xl border border-blue-500/30">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-6 h-6 text-blue-400" />
              <span className="text-gray-400 text-sm">Total Interest</span>
            </div>
            <div className="text-3xl font-bold text-green-400">+{totalInterest.toFixed(2)} XLM</div>
          </div>

          <div className="bg-gradient-to-br from-indigo-800/50 to-indigo-900/50 backdrop-blur-sm p-6 rounded-xl border border-indigo-500/30">
            <div className="flex items-center gap-3 mb-2">
              <Lock className="w-6 h-6 text-indigo-400" />
              <span className="text-gray-400 text-sm">Active Accounts</span>
            </div>
            <div className="text-3xl font-bold">
              {accounts.filter(a => a.status === 'locked').length}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('create')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'create'
                ? 'bg-purple-600 shadow-lg shadow-purple-500/50'
                : 'bg-gray-800 hover:bg-gray-700'
            }`}
          >
            Create Lock
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'dashboard'
                ? 'bg-purple-600 shadow-lg shadow-purple-500/50'
                : 'bg-gray-800 hover:bg-gray-700'
            }`}
          >
            My Accounts ({accounts.length})
          </button>
        </div>

        {/* Create Account Form */}
        {activeTab === 'create' && (
          <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm p-8 rounded-xl border border-gray-700">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Lock className="w-6 h-6 text-purple-400" />
              Create Time-Lock Account
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Stellar Wallet Address</label>
                <input
                  type="text"
                  placeholder="GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                  value={formData.walletAddress}
                  onChange={(e) => setFormData({ ...formData, walletAddress: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Secret Key (For Transaction Signing)</label>
                <input
                  type="password"
                  placeholder="SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                  value={formData.secretKey}
                  onChange={(e) => setFormData({ ...formData, secretKey: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-white"
                />
                <p className="text-xs text-gray-400 mt-1">Never share your secret key. It's used only for signing transactions.</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Amount (XLM)</label>
                <input
                  type="number"
                  placeholder="100"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Lock Period</label>
                <select
                  value={formData.lockPeriod}
                  onChange={(e) => setFormData({ ...formData, lockPeriod: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-white"
                >
                  <option value="30">30 Days - 5% APY</option>
                  <option value="60">60 Days - 8% APY</option>
                  <option value="90">90 Days - 12% APY</option>
                  <option value="180">180 Days - 18% APY</option>
                </select>
              </div>

              {formData.amount && (
                <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4">
                  <div className="text-sm text-gray-300 mb-2">You will receive:</div>
                  <div className="text-2xl font-bold text-green-400">
                    {(parseFloat(formData.amount) + calculateInterest(parseFloat(formData.amount), parseInt(formData.lockPeriod))).toFixed(2)} XLM
                  </div>
                  <div className="text-sm text-gray-400 mt-1">
                    Principal: {parseFloat(formData.amount).toFixed(2)} XLM + Interest: {calculateInterest(parseFloat(formData.amount), parseInt(formData.lockPeriod)).toFixed(2)} XLM
                  </div>
                </div>
              )}

              <button
                onClick={createAccount}
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 py-4 rounded-lg font-bold text-lg transition-all shadow-lg shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Lock & Earn Interest'}
              </button>
            </div>
          </div>
        )}

        {/* Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4">
            {accounts.length === 0 ? (
              <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm p-12 rounded-xl border border-gray-700 text-center">
                <Clock className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-400 mb-2">No Accounts Yet</h3>
                <p className="text-gray-500">Create your first time-lock account to start earning!</p>
              </div>
            ) : (
              accounts.map((account) => {
                const isUnlocked = currentTime >= new Date(account.unlockTime).getTime();
                const progress = Math.min(
                  ((currentTime - new Date(account.createdAt).getTime()) / (new Date(account.unlockTime).getTime() - new Date(account.createdAt).getTime())) * 100,
                  100
                );

                return (
                  <div
                    key={account._id}
                    className={`bg-gradient-to-br backdrop-blur-sm p-6 rounded-xl border transition-all ${
                      account.status === 'withdrawn'
                        ? 'from-gray-800/30 to-gray-900/30 border-gray-700 opacity-60'
                        : isUnlocked
                        ? 'from-green-800/50 to-green-900/50 border-green-500/50 shadow-lg shadow-green-500/20'
                        : 'from-gray-800/50 to-gray-900/50 border-gray-700'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          {account.status === 'withdrawn' ? (
                            <Unlock className="w-6 h-6 text-gray-500" />
                          ) : isUnlocked ? (
                            <Unlock className="w-6 h-6 text-green-400" />
                          ) : (
                            <Lock className="w-6 h-6 text-purple-400" />
                          )}
                          <div>
                            <div className="font-semibold text-lg">
                              {account.amount.toFixed(2)} XLM
                            </div>
                            <div className="text-sm text-gray-400">
                              {account.lockPeriod} Days Lock
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Wallet:</span>
                            <span className="font-mono text-xs">{account.walletAddress.substring(0, 10)}...{account.walletAddress.substring(account.walletAddress.length - 10)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Interest:</span>
                            <span className="text-green-400 font-semibold">
                              +{account.interest.toFixed(2)} XLM ({interestRates[account.lockPeriod]}%)
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Total Return:</span>
                            <span className="font-semibold">
                              {(account.amount + account.interest).toFixed(2)} XLM
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Status:</span>
                            <span className={`font-semibold ${
                              account.status === 'withdrawn'
                                ? 'text-gray-500'
                                : isUnlocked
                                ? 'text-green-400'
                                : 'text-yellow-400'
                            }`}>
                              {account.status === 'withdrawn'
                                ? 'Withdrawn'
                                : isUnlocked
                                ? 'Ready to Withdraw'
                                : 'Locked'}
                            </span>
                          </div>
                        </div>

                        {account.status !== 'withdrawn' && (
                          <div className="mt-4">
                            <div className="flex justify-between text-sm mb-2">
                              <span className="text-gray-400">Time Remaining:</span>
                              <span className="font-mono font-semibold text-purple-400">
                                {getTimeRemaining(account.unlockTime)}
                              </span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-purple-500 to-blue-500 h-full transition-all duration-1000"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {account.status !== 'withdrawn' && (
                        <button
                          onClick={() => withdrawAccount(account._id)}
                          disabled={!isUnlocked || loading}
                          className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                            isUnlocked && !loading
                              ? 'bg-green-600 hover:bg-green-700 shadow-lg shadow-green-500/30'
                              : 'bg-gray-700 cursor-not-allowed opacity-50'
                          }`}
                        >
                          {loading ? 'Processing...' : isUnlocked ? 'Withdraw' : 'Locked'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;