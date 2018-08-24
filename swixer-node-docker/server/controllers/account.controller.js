let async = require('async');
let lodash = require('lodash');
let accountHelper = require('../helpers/account.helper');
let accountDbo = require('../dbos/account.dbo');
let swixerDbo = require('../dbos/swixer.dbo');
let swixerHelper = require('../helpers/swixer.helper');
let coins = require('../../config/coins');
let {
  decimals
} = require('../../config/vars')


let createAccount = (req, res) => {
  let details = req.body;
  let coinSymbol = details.fromSymbol;
  let fromSymbol = details.fromSymbol;
  let toSymbol = details.toSymbol;
  let value = details.value;
  let coinType = coins[toSymbol].type

  async.waterfall([
    (next) => {
      accountDbo.getAccounts([coinType],
        (error, accounts) => {
          if (error) next({
            status: 500,
            message: 'Error occurred while getting accounts.'
          }, null);
          else {
            let addresses = lodash.map(accounts, 'address');
            next(null, addresses);
          }
        });
    }, (addresses, next) => {
      accountHelper.getBalancesOfAccounts(addresses,
        (error, balancesOfAddresses) => {
          if (error && coinType !== 'BTC') next({
            status: 500,
            message: 'Error occurred while getting balances of accounts.'
          }, null);
          else {
            let balances = {}
            balances[toSymbol] = lodash.sum(lodash.map(balancesOfAddresses, toSymbol))
            value /= Math.pow(10, decimals[fromSymbol]);
            value *= details.rate;
            value *= Math.pow(10, decimals[toSymbol]);
            if (coinType !== 'BTC' && value > balances[toSymbol]) {
              let amount = Math.floor(balances[toSymbol] / (Math.pow(10, decimals[toSymbol])))
              next({
                status: 3000,
                message: `Insufficient funds in node. please make a txn lesser than ${amount} ${toSymbol}`
              }, null)
            } else {
              next(null);
            }
          }
        });
    }, (next) => {
      accountHelper.getAccount(coinSymbol,
        (error, account) => {
          if (error) next({
            status: 500,
            message: 'Error occurred while creating a new account.'
          }, null);
          else {
            account.type = coins[coinSymbol].type;
            next(null, account);
          }
        });
    }, (account, next) => {
      accountDbo.insertAccount(account,
        (error, result) => {
          if (error) next({
            status: 500,
            message: 'Error occurred while inserting account.'
          }, null);
          else {
            details.toAddress = account.address;
            next(null);
          }
        });
    }, (next) => {
      swixerHelper.generateSwixHash(details,
        (error, swixHash) => {
          if (error) next({
            status: 500,
            message: 'Error occurred while generating swix hash.'
          }, null);
          else {
            details.swixHash = swixHash;
            next(null);
          }
        });
    }, (next) => {
      swixerDbo.insertSwixDetails(details,
        (error, result) => {
          if (error) next({
            status: 500,
            message: 'Error occurred while adding swix details.'
          }, null);
          else next(null, {
            status: 200,
            swixHash: details.swixHash,
            address: details.toAddress,
            message: 'Swix details have been added successfully.'
          });
        });
    }
  ], (error, success) => {
    if (error) {
      if (error.status !== 3000)
        error.message = 'Error occured while getting deposit address. Please try again'
      error.status = 500
    }

    let response = Object.assign({
      success: !error
    }, error || success);
    let status = response.status;
    delete(response.status);
    res.status(status).send(response);
  });
};

let getBalances = (req, res) => {
  async.waterfall([
    (next) => {
      accountDbo.getAccounts(['ETH', 'BTC'],
        (error, accounts) => {
          if (error) next({
            status: 500,
            message: 'Error occurred while getting accounts.'
          }, null);
          else {
            let addresses = lodash.map(accounts, 'address');
            next(null, addresses);
          }
        });
    }, (addresses, next) => {
      accountHelper.getBalancesOfAccounts(addresses,
        (error, balancesOfAddresses) => {
          if (error) next({
            status: 500,
            message: 'Error occurred while getting balances of accounts.'
          }, null);
          else {
            let balances = {
              ETH: lodash.sum(lodash.map(balancesOfAddresses, 'ETH')),
              BNB: lodash.sum(lodash.map(balancesOfAddresses, 'BNB')),
              SENT: lodash.sum(lodash.map(balancesOfAddresses, 'SENT')),
              PIVX: lodash.sum(lodash.map(balancesOfAddresses, 'PIVX')),
            };
            next(null, {
              status: 200,
              balances
            });
          }
        });
    }
  ], (error, success) => {
    let response = Object.assign({
      success: !error
    }, error || success);
    let status = response.status;
    delete(response.status);
    res.status(status).send(response);
  });
}

let getETHBalances = (req, res) => {
  async.waterfall([
    (next) => {
      accountDbo.getAccounts(['ETH'],
        (error, accounts) => {
          if (error) next({
            status: 500,
            message: 'Error occurred while getting accounts.'
          }, null);
          else {
            let addresses = lodash.map(accounts, 'address');
            next(null, addresses);
          }
        });
    }, (addresses, next) => {
      accountHelper.getBalancesOfAccounts(addresses,
        (error, balancesOfAddresses) => {
          if (error) next({
            status: 500,
            message: 'Error occurred while getting balances of accounts.'
          }, null);
          else {
            let balances = {
              ETH: lodash.sum(lodash.map(balancesOfAddresses, 'ETH')),
              BNB: lodash.sum(lodash.map(balancesOfAddresses, 'BNB')),
              SENT: lodash.sum(lodash.map(balancesOfAddresses, 'SENT'))
            };
            next(null, {
              status: 200,
              balances
            });
          }
        });
    }
  ], (error, success) => {
    let response = Object.assign({
      success: !error
    }, error || success);
    let status = response.status;
    delete(response.status);
    res.status(status).send(response);
  });
}

module.exports = {
  createAccount,
  getBalances,
  getETHBalances
};