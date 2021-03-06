var SibApiV3Sdk = require('sib-api-v3-sdk');
var defaultClient = SibApiV3Sdk.ApiClient.instance;

const sendEmail = (v_link, email) => {
  // Configure API key authorization: api-key
  var apiKey = defaultClient.authentications['api-key'];
  apiKey.apiKey = process.env.SIBAPIKEY;
  var apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

  const sender = {
    email: process.env.USER,
    name: process.env.COMPANY,
  }
  const receivers = [
    {
      email: email,
    },
  ]

  apiInstance.sendTransacEmail({
    sender,
    to: receivers,
    subject: 'Verify Your Email',
    textContent: `
    Cules Coding will teach you how to become {{params.role}} a developer.
    `,
    htmlContent: `<p>Click on given below Link to verify your email id</p>
    <a href=${v_link}>Verify Your Email</a>`,
    params: {
      role: 'Frontend',
    },
  })
    .then(console.log)
    .catch(console.log)
}


module.exports = sendEmail;