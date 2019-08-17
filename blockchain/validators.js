class Validators {
  constructor() {
    //current list of possible validators
    this.list = [
      "5aad9b5e21f63955e8840e8b954926c60e0e2d906fdbc0ce1e3afe249a67f614"
    ];
  }

  //check the consistency of the validator fee transaction
  update(transaction) {
    if (transaction.output.amount == 30 && transaction.output.to == "0") {
      this.list.push(transaction.input.from);
      return true;
    }else{
      return false;
    }
  }
}

module.exports = Validators;
