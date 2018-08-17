let mongoose = require('mongoose');


let accountSchema = new mongoose.Schema({
  address: {
    type: String,
    unique: true
  },
  privateKey: {
    type: String,
    unique: true
  },
  generatedOn: Number
}, {
    strict: true,
    versionKey: false
  });

module.exports = mongoose.model('Account', accountSchema);
