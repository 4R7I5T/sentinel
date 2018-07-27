let async = require('async');
let Tx = require('ethereumjs-tx');
let web3 = require('../web3');
let tokens = require('./tokens');
let { getTransactionCount } = require('./accounts');
let { generatePublicKey,
  generateAddress } = require('../keys');


let transfer = (fromPrivateKey, toAddress, value, coinSymbol, cb) => {
  console.log(fromPrivateKey)
  fromPrivateKey = Buffer.from(fromPrivateKey, 'hex');
  let fromAddress = '0x' + generateAddress(generatePublicKey(fromPrivateKey, false)).toString('hex');
  async.waterfall([
    (next) => { console.log(fromAddress);
      getTransactionCount(fromAddress, 
        (error, count) => { console.log(error, count);
          if (error) next(error, null);
          else next(null, count);
        });
    }, (nonce, next) => {
      try {
        let rawTx = {
          nonce,
          gasPrice: '0x4a817c800', //'0x9502F9000', // '0x4E3B29200', // '0x04a817c800', //web3.eth.gasPrice
          gasLimit: '0xf4240',
          to: coinSymbol === 'ETH' ? toAddress : tokens[coinSymbol].address,
          value: coinSymbol === 'ETH' ? web3.toHex(value) : '0x',
          data: coinSymbol === 'ETH' ? '0x' : tokens[coinSymbol].contract.transfer.getData(toAddress, value)
        };
        console.log(rawTx);
        let tx = new Tx(rawTx);
        tx.sign(fromPrivateKey);
        let serializedTx = '0x' + tx.serialize().toString('hex');
        console.log(serializedTx);
        next(null, serializedTx);
      } catch (error) {
        next(error, null);
      }
    }, (serializedTx, next) => {
      web3.eth.sendRawTransaction(serializedTx,
        (error, txHash) => {
          console.log('error, txHash', error, txHash)
          if (error) next(error, null);
          else next(null, txHash);
        });
    }
  ], (error, txHash) => {
    cb(error, txHash);
  });
};

let getEstimatedGasUnits = (fromAddress, toAddress, value, cb) => {
  web3.eth.estimateGas({
    from: fromAddress,
    to: toAddress,
    value: value
  }, (error, gasUnits) => {
    if (error) cb(error, null);
    else {
      gasUnits = web3.toDecimal(gasUnits);
      cb(null, gasUnits);
    }
  });
};

module.exports = {
  transfer,
  getEstimatedGasUnits
};
