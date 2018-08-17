let web3 = require('./web3');
let tokens = require('./tokens');


let getTransactionCount = (address, cb) => {
  web3.eth.getTransactionCount(address,
    (error, count) => {
      if (error) cb(error, null);
      else {
        count = web3.toDecimal(count);
        cb(null, count);
      }
    });
};

let getTransactionCountSync = (address) => {
  let txCount = web3.eth.getTransactionCount(address);
  return txCount;
};

let getBalance = (address, coinSymbol, cb) => {
  if (coinSymbol === 'ETH') {
    web3.eth.getBalance(address,
      (error, balance) => {
        if (error) cb(error, null);
        else {
          balance = web3.toDecimal(balance);
          cb(null, balance);
        }
      });
  } else {
    tokens.balanceOf(address, coinSymbol,
      (error, balance) => {
        if (error) cb(error, null);
        else {
          balance = web3.toDecimal(balance);
          cb(null, balance);
        }
      });
  }
};

let getBalanceSync = (address, coinSymbol) => {
  let balance = coinSymbol === 'ETH' ? web3.eth.getBalance(address) : tokens.balanceOfSync(address, coinSymbol);
  balance = web3.toDecimal(balance);
  return balance;
}

module.exports = {
  getBalance: getBalance,
  getTransactionCount: getTransactionCount,
  getBalanceSync: getBalanceSync,
  getTransactionCountSync: getTransactionCountSync
};
