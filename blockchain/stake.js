const getLastHash = require("../blockchain/blockchain").getLastHash;
const Blockchain = require("../blockchain/blockchain");

class Stake {

  //list of addresses referred to accounts that put money in the stake
  constructor() {
    this.addresses = [
      "5aad9b5e21f63955e8840e8b954926c60e0e2d906fdbc0ce1e3afe249a67f614"
    ];
    this.balance = {
      "5aad9b5e21f63955e8840e8b954926c60e0e2d906fdbc0ce1e3afe249a67f614": 0
    };
  }

  initialize(address) {
    if (this.balance[address] == undefined) {
      this.balance[address] = 0;
      this.addresses.push(address);
    }
  }

  addStake(from, amount) {
    this.initialize(from);
    this.balance[from] += amount;
  }

  getBalance(address) {
    this.initialize(address);
    return this.balance[address];
  }

  //get the current leader
  getMax(addresses) {
    let balance = -1;
    let leader = undefined;
    addresses.forEach(address => { 
      this.initialize(address);
      if (this.getBalance(address) > balance) {
        leader = address;
        balance = this.getBalance(address);
      }
    });
    return leader;
  }

  update(transaction) {
    let amount = transaction.output.amount;
    let from = transaction.input.from;
    this.addStake(from, amount);
  }

  lastHash(hash) {
    console.log(`last hash : ${hash}`);
    return hash;
  }

  //extract leader from list containing as many lines of one address as the number of coins he put in stake
  extractLeader(lastHash, addresses) {       
    let canditatesList = [];
    var leader;
    addresses.forEach(address => { 
      this.initialize(address);
      let balance = this.getBalance(address);
      var i = 0;
      for (i=0; i<balance; i++) {
        canditatesList.push(address);
      }
    });
      var intHash = parseInt(lastHash, 16);
      var rand = intHash % canditatesList.length;
      leader = canditatesList[rand];

    leader = canditatesList[rand];

    //when only ico is validator
    if ( leader == undefined) {     
      leader = addresses[0];
    }
    return leader;
  }
}

module.exports = Stake;