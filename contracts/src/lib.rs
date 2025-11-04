#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, Symbol};

#[derive(Clone)]
#[contracttype]
pub struct TimeLock {
    pub owner: Address,
    pub amount: i128,
    pub unlock_time: u64,
    pub interest_rate: u32,
    pub withdrawn: bool,
}

const TIMELOCK: Symbol = symbol_short!("TIMELOCK");

#[contract]
pub struct TimeLockContract;

#[contractimpl]
impl TimeLockContract {
    /// Create a new time-locked savings account
    pub fn create_lock(
        env: Env,
        owner: Address,
        amount: i128,
        lock_period_days: u32,
        interest_rate: u32,
    ) -> u64 {
        // Require owner authentication
        owner.require_auth();

        // Calculate unlock time (current ledger timestamp + lock period)
        let current_time = env.ledger().timestamp();
        let lock_period_seconds = lock_period_days as u64 * 86400; // days to seconds
        let unlock_time = current_time + lock_period_seconds;

        // Create timelock entry
        let timelock = TimeLock {
            owner: owner.clone(),
            amount,
            unlock_time,
            interest_rate,
            withdrawn: false,
        };

        // Generate unique ID
        let lock_id = env.ledger().sequence();

        // Store timelock
        env.storage().persistent().set(&(TIMELOCK, lock_id), &timelock);

        // Emit event
        env.events().publish(
            (symbol_short!("created"), owner),
            (lock_id, amount, unlock_time),
        );

        lock_id
    }

    /// Withdraw funds after unlock time
    pub fn withdraw(env: Env, owner: Address, lock_id: u64) -> i128 {
        owner.require_auth();

        // Get timelock
        let key = (TIMELOCK, lock_id);
        let mut timelock: TimeLock = env
            .storage()
            .persistent()
            .get(&key)
            .expect("Timelock not found");

        // Verify owner
        if timelock.owner != owner {
            panic!("Not the owner");
        }

        // Check if already withdrawn
        if timelock.withdrawn {
            panic!("Already withdrawn");
        }

        // Check unlock time
        let current_time = env.ledger().timestamp();
        if current_time < timelock.unlock_time {
            panic!("Lock period not expired");
        }

        // Calculate total amount with interest
        let interest = (timelock.amount * timelock.interest_rate as i128) / 100;
        let total_amount = timelock.amount + interest;

        // Mark as withdrawn
        timelock.withdrawn = true;
        env.storage().persistent().set(&key, &timelock);

        // Emit event
        env.events().publish(
            (symbol_short!("withdraw"), owner),
            (lock_id, total_amount),
        );

        total_amount
    }

    /// Get timelock details
    pub fn get_lock(env: Env, lock_id: u64) -> TimeLock {
        let key = (TIMELOCK, lock_id);
        env.storage()
            .persistent()
            .get(&key)
            .expect("Timelock not found")
    }

    /// Check if timelock is unlocked
    pub fn is_unlocked(env: Env, lock_id: u64) -> bool {
        let timelock: TimeLock = Self::get_lock(env.clone(), lock_id);
        let current_time = env.ledger().timestamp();
        current_time >= timelock.unlock_time
    }

    /// Calculate total return (principal + interest)
    pub fn calculate_return(env: Env, lock_id: u64) -> i128 {
        let timelock: TimeLock = Self::get_lock(env, lock_id);
        let interest = (timelock.amount * timelock.interest_rate as i128) / 100;
        timelock.amount + interest
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Address, Env};

    #[test]
    fn test_create_and_withdraw() {
        let env = Env::default();
        let contract_id = env.register_contract(None, TimeLockContract);
        let client = TimeLockContractClient::new(&env, &contract_id);

        let owner = Address::generate(&env);
        
        // Create lock
        let lock_id = client.create_lock(&owner, &1000, &30, &5);
        
        // Verify lock created
        let timelock = client.get_lock(&lock_id);
        assert_eq!(timelock.amount, 1000);
        assert_eq!(timelock.interest_rate, 5);
        
        // Calculate expected return
        let expected_return = client.calculate_return(&lock_id);
        assert_eq!(expected_return, 1050); // 1000 + 5% = 1050
    }

    #[test]
    #[should_panic(expected = "Lock period not expired")]
    fn test_early_withdrawal() {
        let env = Env::default();
        let contract_id = env.register_contract(None, TimeLockContract);
        let client = TimeLockContractClient::new(&env, &contract_id);

        let owner = Address::generate(&env);
        
        let lock_id = client.create_lock(&owner, &1000, &30, &5);
        
        // Try to withdraw immediately (should fail)
        client.withdraw(&owner, &lock_id);
    }
}