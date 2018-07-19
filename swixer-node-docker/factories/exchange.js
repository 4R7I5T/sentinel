let axios = require('axios');
let { master } = require('../config/vars');


let getExchangeRateValue = (amount, fromSymbol, toSymbol, cb) => {
  let url = `${master}/swix/rate?node=0x47bd80a152d0d77664d65de5789df575c9cabbdb&from=${fromSymbol}&to=${toSymbol}&value=${amount}`
  axios.get(url)
    .then((response) => {
      console.log(response.data);
      if (response.status === 200 &&
        response.data.success === true) {
        let amount = response.data.value;
        cb(null, amount);
      } else cb({
        message: 'Unsuccessful request.'
      }, null);
    })
    .catch((error) => {
      console.log(error);
      cb(error, null);
    });
};

module.exports = {
  getExchangeRateValue
};