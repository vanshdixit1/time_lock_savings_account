import * as StellarSdk from '@stellar/stellar-sdk';

const TESTNET = true;
const SERVER_URL = TESTNET 
  ? 'https://horizon-testnet.stellar.org'
  : 'https://horizon.stellar.org';

const NETWORK_PASSPHRASE = TESTNET
  ? StellarSdk.Networks.TESTNET
  : StellarSdk.Networks.PUBLIC;

class StellarService {
  constructor() {
    this.server = new StellarSdk.Horizon.Server(SERVER_URL);
    this.freighterAvailable = false;
    this.publicKey = null; // set after connecting to Freighter
    // Detect Freighter on window - modern freighter exposes `window.freighterApi`
    if (typeof window !== 'undefined') {
      this.freighterAvailable = !!(window.freighterApi || window.freighter);
    }
  }

  // legacy method that signs with a secret key (kept for tests/admins)
  async createTimeLock(secretKey, amount, lockPeriodDays) {
    try {
      const sourceKeypair = StellarSdk.Keypair.fromSecret(secretKey);
      const sourcePublicKey = sourceKeypair.publicKey();

      // Load account
      const account = await this.server.loadAccount(sourcePublicKey);

      // Calculate unlock time
      const unlockTime = Math.floor(Date.now() / 1000) + (lockPeriodDays * 24 * 60 * 60);

      // Build transaction
      const transaction = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          StellarSdk.Operation.payment({
            destination: sourcePublicKey,
            asset: StellarSdk.Asset.native(),
            amount: amount.toString(),
          })
        )
        .addMemo(StellarSdk.Memo.text(`TIMELOCK:${unlockTime}`))
        .setTimeout(30)
        .build();

      // Sign and submit
      transaction.sign(sourceKeypair);
      const result = await this.server.submitTransaction(transaction);

      return result.hash;
    } catch (error) {
      console.error('Stellar transaction error:', error);
      throw new Error(error.message || 'Failed to create time-lock');
    }
  }

  // legacy withdraw using secret key
  async withdraw(secretKey, amount) {
    try {
      const sourceKeypair = StellarSdk.Keypair.fromSecret(secretKey);
      const sourcePublicKey = sourceKeypair.publicKey();

      const account = await this.server.loadAccount(sourcePublicKey);

      const transaction = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          StellarSdk.Operation.payment({
            destination: sourcePublicKey,
            asset: StellarSdk.Asset.native(),
            amount: amount.toString(),
          })
        )
        .addMemo(StellarSdk.Memo.text('WITHDRAW'))
        .setTimeout(30)
        .build();

      transaction.sign(sourceKeypair);
      const result = await this.server.submitTransaction(transaction);

      return result.hash;
    } catch (error) {
      console.error('Withdrawal error:', error);
      throw new Error(error.message || 'Failed to withdraw');
    }
  }

  // ---------- Freighter integration ----------
  isFreighterAvailable() {
    return this.freighterAvailable;
  }

  async connectFreighter() {
    if (!this.isFreighterAvailable()) {
      throw new Error('Freighter wallet not detected. Please install Freighter.');
    }

    try {
      // Modern Freighter exposes `window.freighterApi.getPublicKey()`
      if (window.freighterApi && typeof window.freighterApi.getPublicKey === 'function') {
        this.publicKey = await window.freighterApi.getPublicKey();
      } else if (window.freighter && typeof window.freighter.getPublicKey === 'function') {
        this.publicKey = await window.freighter.getPublicKey();
      } else {
        throw new Error('Freighter provider found but does not expose getPublicKey()');
      }

      return this.publicKey;
    } catch (err) {
      console.error('Failed to connect to Freighter:', err);
      throw err;
    }
  }

  // Helper to sign an unsigned Transaction (built locally) using Freighter and submit it
  async signAndSubmitWithFreighter(transaction) {
    if (!this.isFreighterAvailable()) {
      throw new Error('Freighter wallet not detected.');
    }

    // Convert to XDR (base64) and request Freighter to sign
    const txXdr = transaction.toXDR();

    let signedXdr;
    try {
      // Try modern API shapes (returns signed XDR string or an object)
      if (window.freighterApi && typeof window.freighterApi.signTransaction === 'function') {
        const signed = await window.freighterApi.signTransaction(txXdr);
        // signed may be a string or object
        if (typeof signed === 'string') signedXdr = signed;
        else if (signed?.signed_transaction) signedXdr = signed.signed_transaction;
        else if (signed?.signed_envelope_xdr) signedXdr = signed.signed_envelope_xdr;
        else if (signed?.signedXDR) signedXdr = signed.signedXDR;
        else signedXdr = JSON.stringify(signed);
      } else if (window.freighter && typeof window.freighter.signTransaction === 'function') {
        const signed = await window.freighter.signTransaction(txXdr);
        if (typeof signed === 'string') signedXdr = signed;
        else if (signed?.signed_envelope_xdr) signedXdr = signed.signed_envelope_xdr;
        else signedXdr = JSON.stringify(signed);
      } else {
        throw new Error('Freighter signing API not available');
      }
    } catch (err) {
      console.error('Freighter signing failed:', err);
      throw err;
    }

    // Submit signed envelope XDR to Horizon
    try {
      // If signedXdr is JSON (unexpected), throw
      if (typeof signedXdr !== 'string') {
        throw new Error('Unexpected signed XDR format from Freighter');
      }

      // server.submitTransaction accepts a base64 XDR string
      const result = await this.server.submitTransaction(signedXdr);
      return result.hash || result;
    } catch (err) {
      console.error('Failed to submit signed transaction:', err.response || err);
      throw err;
    }
  }

  // Create timelock using Freighter (no secret key in client-side code)
  async createTimeLockWithFreighter(amount, lockPeriodDays) {
    if (!this.publicKey) {
      await this.connectFreighter();
    }

    try {
      const sourcePublicKey = this.publicKey;
      const account = await this.server.loadAccount(sourcePublicKey);

      const unlockTime = Math.floor(Date.now() / 1000) + (lockPeriodDays * 24 * 60 * 60);

      const transaction = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          StellarSdk.Operation.payment({
            destination: sourcePublicKey,
            asset: StellarSdk.Asset.native(),
            amount: amount.toString(),
          })
        )
        .addMemo(StellarSdk.Memo.text(`TIMELOCK:${unlockTime}`))
        .setTimeout(30)
        .build();

      const hash = await this.signAndSubmitWithFreighter(transaction);
      return hash;
    } catch (error) {
      console.error('createTimeLockWithFreighter error:', error);
      throw error;
    }
  }

  async withdrawWithFreighter(amount) {
    if (!this.publicKey) {
      await this.connectFreighter();
    }

    try {
      const sourcePublicKey = this.publicKey;
      const account = await this.server.loadAccount(sourcePublicKey);

      const transaction = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          StellarSdk.Operation.payment({
            destination: sourcePublicKey,
            asset: StellarSdk.Asset.native(),
            amount: amount.toString(),
          })
        )
        .addMemo(StellarSdk.Memo.text('WITHDRAW'))
        .setTimeout(30)
        .build();

      const hash = await this.signAndSubmitWithFreighter(transaction);
      return hash;
    } catch (error) {
      console.error('withdrawWithFreighter error:', error);
      throw error;
    }
  }

  async getAccountBalance(publicKey) {
    try {
      const account = await this.server.loadAccount(publicKey);
      const balance = account.balances.find(
        (b) => b.asset_type === 'native'
      );
      return parseFloat(balance.balance);
    } catch (error) {
      throw new Error('Failed to fetch balance');
    }
  }
}

export default new StellarService();