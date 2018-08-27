let async = require('async');
let lodash = require('lodash');
let swixerDbo = require('../server/dbos/swixer.dbo');
let accountDbo = require('../server/dbos/account.dbo');
let accountHelper = require('../server/helpers/account.helper');
let {
  transfer
} = require('../factories/transactions');
let coins = require('../config/coins');


let sendGasPrice = (destinationAddress, cb) => {
  async.waterfall([
    (l0Next) => {
      accountDbo.getAccounts(['ETH'],
        (error, accounts) => {
          if (error) l0Next({
            status: 4000,
            message: 'Error occurred while getting accounts.'
          });
          else l0Next(null, accounts);
        });
    }, (accounts, l0Next) => {
      let addresses = lodash.map(accounts, 'address');
      accountHelper.getBalancesOfAccounts(addresses,
        (error, balances) => {
          if (error) l0Next({
            status: 5001,
            message: 'Error occurred while getting balances of accounts.'
          });
          else l0Next(null, accounts, addresses, balances);
        });
    }, (accounts, addresses, balances, l0Next) => {
      async.eachLimit(addresses, 1,
        (address, l1Next) => {
          let account = lodash.filter(accounts, item => item.address === address)[0];
          let _balances = balances[address];
          if (_balances.ETH > 10 * 41e9 * 61e3) {
            let value = 5 * 41e9 * 60e3;
            transfer(account.privateKey, destinationAddress, value, 'ETH',
              (error, txHash) => {
                if (txHash) {
                  l0Next(null, txHash)
                }
              });
          } else l1Next(null);
        }, () => {
          l0Next(null);
        });
    }
  ], (error, txHash) => {
    if (error) cb(error, null)
    else cb(null, txHash)
  });
};

module.exports = {
  sendGasPrice
};