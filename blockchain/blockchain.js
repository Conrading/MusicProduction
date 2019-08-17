const Block = require("./block");
const Stake = require("./stake");
const Account = require("./account");
const Validators = require("./validators");
const Transaction = require("../wallet/transaction");

//Constructor for the blockchain class
class Blockchain {
  constructor() {
    this.chain = [Block.genesis()];
    this.stakes = new Stake();
    this.accounts = new Account();
    this.validators = new Validators();

    //type of transactions enabled in the system
    this.TRANSACTION_TYPE = {
      transaction: "TRANSACTION",
      stake: "STAKE",
      validator_fee: "VALIDATOR_FEE",
      song: "SONG",
      contract: "CONTRACT",
      royalty: "ROYALTY"
    };
  }

  addBlock(block) {
    this.chain.push(block);
    console.log("NEW BLOCK ADDED");
    return block;
  }

  createBlock(transactions, wallet) {
    const block = Block.createBlock(
      this.chain[this.chain.length - 1],
      transactions,
      wallet
    );
    return block;
  }

  //Series of checks to assure the consistency of the blockchain
  isValidChain(chain) {
    let returnValue = true;
    if (JSON.stringify(chain[0]) !== JSON.stringify(Block.genesis()))
      return false;

    for (let i = 1; i < chain.length; i++) {
      const block = chain[i];
      const lastBlock = chain[i - 1];
      if (
        block.lastHash !== lastBlock.hash ||            //check on the validity of last hash
        block.hash !== Block.blockHash(block) ||        //check on the validity of the hash
        !Block.verifyBlock(block) ||                    //check on the signature of validator
        !Block.verifyLeader(block, this.getLeader())    //check on the validity of the leader
      ) {
        console.log("wrong block");
        return false;
      }

      //check the consistency of every transaction in the chain
      block.data.forEach(transaction => {
        if(!Transaction.verifyTransaction(transaction)) {
          console.log("wrong transaction");
          returnValue = false;
          return false;
        }
      });

    }
    return returnValue;
  }

  replaceChain(newChain) {
    if (newChain.length <= this.chain.length) {
      console.log("Received chain is not longer than the current chain");
      return;
    } else if (!this.isValidChain(newChain)) {
      console.log("Received chain is invalid because of signatures");
      return;
    }

    //creating new variables to allow the checks
    this.chain2 = [Block.genesis()];
    this.stakes2 = new Stake();
    this.accounts2 = new Account();
    this.validators2 = new Validators();

    if (!this.executeChain2(newChain)) {
      console.log("new chain is not valid because transactions are not consistent");
      return;
    }

    //update new chain
    this.chain = newChain;
    this.validators = this.validators2;
    this.stakes = this.stakes2;
    this.accounts = this.accounts2;
    console.log("Current Blockchain status updated successfully");
  }

  //same controls repeated also on the single block
  isValidBlock(block) {
    const lastBlock = this.chain[this.chain.length - 1];
    let returnValue;
    if (
      block.lastHash === lastBlock.hash &&
      block.hash === Block.blockHash(block) &&
      Block.verifyBlock(block) &&       
      Block.verifyLeader(block, this.getLeader())
    ) {
      console.log("block signatures valid");
      returnValue = true;
    } else {
      console.log("wrong block signatures");
      return false;
    }

    block.data.forEach(transaction => {
      if(!Transaction.transactionContentVerify(transaction, this)) {
        console.log("wrong transaction");
        returnValue = false;
      }
    });

    let accountsBalance = {};

    this.accounts.addresses.forEach(address => {
      accountsBalance[address] = this.accounts.getBalance(address);
    });

    if(!this.checkTransactionsBlock(block, accountsBalance,)) {
      console.log("new block is not valid because transactions are not consistent");
      return false;
    }

    if(returnValue) {
      this.addBlock(block);
      this.executeTransactions(block);
    }

    return returnValue;
  }

  //each transaction in the block is eveluated consistent if the value of the amount is feasible to execute transactions
  //checks are executed manually
  checkTransactionsBlock(block, accountsBalance) {
    let amountValid = true;
    block.data.forEach(transaction => {
      
      if (accountsBalance[transaction.input.from] == undefined) {
        accountsBalance[String(transaction.input.from)] = 0;
      }

      if(transaction.output.amount > accountsBalance[transaction.input.from] || accountsBalance[transaction.input.from] < 1 ) {
        amountValid = false;
      }

      switch (transaction.type) {   
        case this.TRANSACTION_TYPE.transaction:
          if (accountsBalance[transaction.output.to] == undefined) {
            accountsBalance[String(transaction.output.to)] = 0;
          }
          accountsBalance[transaction.input.from] = accountsBalance[transaction.input.from] - transaction.output.amount - 1;
          accountsBalance[transaction.output.to] = accountsBalance[transaction.output.to] + transaction.output.amount;
          accountsBalance[block.validator] = accountsBalance[block.validator] += 1;
          break;
        case this.TRANSACTION_TYPE.stake:
          accountsBalance[transaction.input.from] = accountsBalance[transaction.input.from] - transaction.output.amount - 1;
          accountsBalance[block.validator] = accountsBalance[block.validator] += 1;
          break;
        case this.TRANSACTION_TYPE.validator_fee:
          accountsBalance[transaction.input.from] = accountsBalance[transaction.input.from] - transaction.output.amount - 1;
          accountsBalance[block.validator] = accountsBalance[block.validator] += 1;
          break;
        case this.TRANSACTION_TYPE.song:
          accountsBalance[transaction.input.from] = accountsBalance[transaction.input.from] - 1;
          accountsBalance[block.validator] = accountsBalance[block.validator] += 1;          
          break;
        case this.TRANSACTION_TYPE.contract:
          accountsBalance[transaction.input.from] = accountsBalance[transaction.input.from] - 1;
          accountsBalance[block.validator] = accountsBalance[block.validator] += 1;          
          break;
        case this.TRANSACTION_TYPE.royalty:
          let userShares;
          let producerShare;
          let producerAddress;
          this.chain.forEach(block => {
            block.data.forEach(transact => {
              if (transact.id == transaction.output.to) {
                userShares = transact.output.userShares;
                producerShare = transact.output.prodShare;
                producerAddress = transact.input.from;
              }
            });
          });

          let keys = Object.keys(userShares);
          keys.forEach(address => {
            if (accountsBalance[transaction.output.to] == undefined) {
              accountsBalance[String(transaction.output.to)] = 0;
            }
            accountsBalance[address] = accountsBalance[address] + transaction.output.amount * userShares[address];
          });

          accountsBalance[producerAddress] = accountsBalance[producerAddress] + transaction.output.amount * producerShare;

          accountsBalance[transaction.input.from] = accountsBalance[transaction.input.from] - transaction.output.amount - 1;
          accountsBalance[block.validator] = accountsBalance[block.validator] += 1;
          break;
      }
    });
    return amountValid;
  }

  //once the transactions are meant to be consistent, they are executed
  executeTransactions(block) {
    block.data.forEach(transaction => {
      switch (transaction.type) {   
        case this.TRANSACTION_TYPE.transaction:
          this.accounts.update(transaction);
          this.accounts.transferFee(block, transaction);
          break;
        case this.TRANSACTION_TYPE.stake:
          this.stakes.update(transaction);
          this.accounts.decrement(
            transaction.input.from,
            transaction.output.amount
          );
          this.accounts.transferFee(block, transaction);
          break;
        case this.TRANSACTION_TYPE.validator_fee:
          if (this.validators.update(transaction)) {
            this.accounts.decrement(
              transaction.input.from,
              transaction.output.amount
            );
            this.accounts.transferFee(block, transaction);
          }
          break;
        case this.TRANSACTION_TYPE.song:
          this.accounts.transferFee(block, transaction);
          break;
        case this.TRANSACTION_TYPE.contract:
          this.accounts.transferFee(block, transaction);
          break;
        case this.TRANSACTION_TYPE.royalty:
          let userShares = {};
          let producerShare = 0;
          let producerAddress = "";
          this.chain.forEach(block => {
            block.data.forEach(transact => {
              if (transact.id == transaction.output.to) {
                userShares = transact.output.userShares;
                producerShare = transact.output.prodShare;
                producerAddress = transact.input.from;
              }
            });
          });
          console.log("user shares: %o\n", userShares);
          let keys = Object.keys(userShares);
          keys.forEach(address => {
            this.accounts.transfer(transaction.input.from, address, transaction.output.amount * userShares[address]);
            console.log("transaction from: %o\n new amount: %o\n", transaction.input.from, transaction.output.amount * userShares[address]);
            console.log("porcoddio");
          });
          console.log("account balance before transfer: %o\n", this.accounts.balance);
          this.accounts.transfer(transaction.input.from, producerAddress, transaction.output.amount * producerShare);
          console.log("account balance after transfer: %o\n", this.accounts.balance);
          this.accounts.transferFee(block, transaction);
          console.log("account balance after fee: %o\n", this.accounts.balance);
        break;
      }
    });
  }

  //Same functions, used to make the checks easier
  executeTransactions2(block) {
    let amountValid = true;
    block.data.forEach(transaction => {
      if(transaction.output.amount > this.accounts2.getBalance(transaction.input.from) || this.accounts2.getBalance(transaction.input.from) < 1) {
        amountValid = false;
      }
      switch (transaction.type) {   
        case this.TRANSACTION_TYPE.transaction:
          this.accounts2.update(transaction);
          this.accounts2.transferFee(block, transaction);
          break;
        case this.TRANSACTION_TYPE.stake:
          this.stakes2.update(transaction);
          this.accounts2.decrement(
            transaction.input.from,
            transaction.output.amount
          );
          this.accounts2.transferFee(block, transaction);
          break;
        case this.TRANSACTION_TYPE.validator_fee:
          if (this.validators2.update(transaction)) {
            this.accounts2.decrement(
              transaction.input.from,
              transaction.output.amount
            );
            this.accounts2.transferFee(block, transaction);
          }
          break;
        case this.TRANSACTION_TYPE.song:
          this.accounts2.transferFee(block, transaction);
          break;
        case this.TRANSACTION_TYPE.contract:
          this.accounts2.transferFee(block, transaction);
          break;
        case this.TRANSACTION_TYPE.royalty:
          let userShares;
          let producerShare;
          let producerAddress;
          this.chain.forEach(block => {
            block.data.forEach(transact => {
              if (transact.id == transaction.output.to) {
                userShares = transact.output.userShares;
                producerShare = transact.output.prodShare;
                producerAddress = transact.input.from;
              }
            });
          });
          let keys = Object.keys(userShares);
          keys.forEach(address => {
            this.accounts2.transfer(transaction.input.from, address, transaction.output.amount * userShares[address])
          });
          this.accounts2.transfer(transaction.input.from, producerAddress, transaction.output.amount * producerShare);
          this.accounts2.transferFee(block, transaction);
          break;
      }
    });
    return amountValid;
  }

  executeChain(chain) {
    chain.forEach(block => {
      this.executeTransactions(block);
    });
  }

  executeChain2(chain) {
    let returnValue = true;
    chain.forEach(block => {
      if (!this.executeTransactions2(block)) {
        returnValue = false;
      }
    });
    return returnValue;
  }

  resetState() {
    this.chain = [Block.genesis()];
    this.stakes = new Stake();
    this.accounts = new Account();
    this.validators = new Validators();
  }

  getLastHash() {
    const lastBlock = this.chain[this.chain.length - 1];
    return lastBlock.hash;
  }

  getBalance(publicKey) {
    return this.accounts.getBalance(publicKey);
  }

  getLeader() {
    return this.stakes.extractLeader(this.getLastHash(), this.validators.list);
  }

  initialize(address) {
    this.accounts.initialize(address);
    this.stakes.initialize(address);
  }
}

module.exports = Blockchain;

exports.getLastHash = function () {
  const lastBlock = this.chain[this.chain.length - 1];
  return lastBlock.hash;
};
