let web3 = require('../web3');
let tokens = require('./tokens');
let {
  generatePrivateKey,
  generatePublicKey,
  generateAddress
} = require('../keys');
let redis = require('redis');
let redisClient = redis.createClient();


let getTransactionCount = (address, cb) => {
  let key = address
  redisClient.get(key, (err, previousNonce) => {
    console.log('previous nonce', previousNonce)
    if (previousNonce) {
      web3.eth.getTransactionCount(address, 'pending', (error, count) => {
        console.log('error, nonce, previousNonce', error, count, previousNonce)
        if (error) cb(error, null);
        else {
          if (count > previousNonce)
            previousNonce = count;
          previousNonce = parseInt(previousNonce);
          redisClient.set(address, previousNonce + 1);
          cb(null, previousNonce + 1);
        }
      })
    } else {
      console.log(address);
      web3.eth.getTransactionCount(address, 'pending',
        (error, count) => {
          console.log('nonce', error, count);
          if (error) cb(error, null);
          else {
            count = web3.toDecimal(count);
            redisClient.set(key, count)
            cb(null, count);
          }
        });
    }
  });
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
    tokens.getBalance(address, coinSymbol,
      (error, balance) => {
        if (error) cb(error, null);
        else {
          balance = web3.toDecimal(balance);
          cb(null, balance);
        }
      });
  }
};

let getAccount = (cb) => {
  try {
    let privateKey = generatePrivateKey();
    let address = '0x' + generateAddress(generatePublicKey(privateKey, false)).toString('hex');
    let account = {
      address,
      privateKey: privateKey.toString('hex')
    };
    cb(null, account);
  } catch (error) {
    cb(error, null);
  }
};

module.exports = {
  getBalance,
  getTransactionCount,
  getAccount
};