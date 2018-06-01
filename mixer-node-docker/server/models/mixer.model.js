let mongoose = require('mongoose');


let mixDetailsSchema = new mongoose.Schema({
  toAddress: {
    type: String,
    unique: true
  },
  destinationAddress: String,
  delayInSeconds: Number,
  coinSymbol: String,
  insertedOn: Number,
  mixHash: String,
  tries: Number,
  remainingAmount: Number,
  lastUpdateOn: Number,
  transactionStatuses: Array,
  message: String
}, {
    strict: true,
    versionKey: false
  });

module.exports = mongoose.model('MixDetails', mixDetailsSchema);