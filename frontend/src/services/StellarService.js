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
  }

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