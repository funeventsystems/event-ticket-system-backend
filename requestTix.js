const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const nodemailer = require('nodemailer');
const app = express();
const port = 3000; // You can choose any port you like


app.use(bodyParser.urlencoded({ extended: true }));


// Serve static files (like your HTML page)
app.use(express.static('public'));

// Nodemailer setup (configure with your Zoho credentials)
const transporter = nodemailer.createTransport({
service: 'Zoho',
auth: {
user: secrets.email, // Use the email from secrets.json
pass: secrets.password, // Use the password from secrets.json
},
});



app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
