const ChainUtil = require("../chain-util");
const Transaction = require("./transaction");
const { TRANSACTION_FEE } = require("../config");
const Contract = require("./contract");

class Wallet {
  constructor(secret) {
    this.balance = 100;
    this.keyPair = ChainUtil.genKeyPair(secret);
    this.publicKey = this.keyPair.getPublic("hex");
  }

  toString() {
    return `Wallet - 
        publicKey: ${this.publicKey.toString()}
        balance  : ${this.balance}`;
  }

  sign(dataHash) {
    return this.keyPair.sign(dataHash).toHex();
  }

  //Create new transaction if the balance is enough to allow the operation 
  createTransaction(to, amount, type, blockchain, transactionPool, soundHash, prodShare, userShare, paymentMethod, prevID) {
    this.balance = this.getBalance(blockchain);
    if (amount > this.balance) {
      console.log(`Amount: ${amount} exceeds the current balance: ${this.balance}`);
      return false;
    }
    let transaction = Transaction.newTransaction(blockchain, this, to, amount, type, soundHash, prodShare, userShare, paymentMethod, prevID);
    if (Transaction.transactionContentVerify(transaction, blockchain)) {
      transactionPool.addTransaction(transaction);
      return transaction;
    }
    else {
      return false;
    }
  }

  //Create a new contract if the balance is enough to allow the operation 
  createContract(blockchain, transactionPool, paymentMethod, transactionIDs, songHash, prodShare) {
    this.balance = this.getBalance(blockchain);
    if (this.balance < TRANSACTION_FEE) {
      console.log(` current balance: ${this.balance} is lower than transaction fee`);
      return;
    }
    let contract = Contract.newContract(blockchain, this, paymentMethod, transactionIDs, songHash, prodShare);
    if (Transaction.transactionContentVerify(contract, blockchain)) {
      transactionPool.addTransaction(contract);
      return contract;
    }
    else {
      return false;
    }
  }

  getBalance(blockchain) {
    return blockchain.getBalance(this.publicKey);
  }

  getPublicKey() {
    return this.publicKey;
  }
}

module.exports = Wallet;
