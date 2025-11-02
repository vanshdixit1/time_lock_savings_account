#![allow(non_snake_case)]
#![no_std]
use soroban_sdk::{contract, contracttype, contractimpl, log, Env, Address};

// Structure to store time-locked savings account
#[contracttype]
#[derive(Clone)]
pub struct TimeLockAccount {
    pub owner: Address,
    pub balance: i128,
    pub unlock_time: u64,
    pub withdrawn: bool,
}

// Mapping user address to their account
#[contracttype]
pub enum AccountStorage {
    Account(Address)
}

#[contract]
pub struct TimeLockSavings;

#[contractimpl]
impl TimeLockSavings {
    
    // Function 1: Deposit funds with time lock
    pub fn deposit(env: Env, owner: Address, amount: i128, lock_duration: u64) {
        owner.require_auth();
        
        // Validate amount
        if amount <= 0 {
            log!(&env, "Amount must be positive");
            panic!("Invalid amount");
        }
        
        // Check if account already exists
        let key = AccountStorage::Account(owner.clone());
        let existing = env.storage().instance().get::<AccountStorage, TimeLockAccount>(&key);
        
        if existing.is_some() {
            log!(&env, "Account already exists");
            panic!("Account already exists");
        }
        
        let current_time = env.ledger().timestamp();
        let unlock_time = current_time + lock_duration;
        
        // Create new account
        let account = TimeLockAccount {
            owner: owner.clone(),
            balance: amount,
            unlock_time,
            withdrawn: false,
        };
        
        env.storage().instance().set(&key, &account);
        env.storage().instance().extend_ttl(5000, 5000);
        
        log!(&env, "Deposited {} tokens. Unlock time: {}", amount, unlock_time);
    }
    
    // Function 2: Withdraw funds after lock period
    pub fn withdraw(env: Env, owner: Address) -> i128 {
        owner.require_auth();
        
        let key = AccountStorage::Account(owner.clone());
        let mut account = env.storage().instance()
            .get::<AccountStorage, TimeLockAccount>(&key)
            .unwrap_or_else(|| {
                log!(&env, "Account not found");
                panic!("No account found");
            });
        
        // Check if already withdrawn
        if account.withdrawn {
            log!(&env, "Already withdrawn");
            panic!("Funds already withdrawn");
        }
        
        let current_time = env.ledger().timestamp();
        
        // Check if lock period expired
        if current_time < account.unlock_time {
            log!(&env, "Lock period active. Unlock at: {}", account.unlock_time);
            panic!("Cannot withdraw yet");
        }
        
        let amount = account.balance;
        account.withdrawn = true;
        
        env.storage().instance().set(&key, &account);
        env.storage().instance().extend_ttl(5000, 5000);
        
        log!(&env, "Withdrawn {} tokens", amount);
        amount
    }
    
    // Function 3: Check account balance and status
    pub fn check_account(env: Env, owner: Address) -> TimeLockAccount {
        let key = AccountStorage::Account(owner.clone());
        
        env.storage().instance()
            .get(&key)
            .unwrap_or(TimeLockAccount {
                owner: owner.clone(),
                balance: 0,
                unlock_time: 0,
                withdrawn: false,
            })
    }
}