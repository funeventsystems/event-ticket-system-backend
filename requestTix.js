const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const nodemailer = require('nodemailer');
const app = express();
const port = 3000; // You can choose any port you like

app.use(bodyParser.urlencoded({ extended: false }));

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

app.post('/purchase', (req, res) => {
  // Process the form data here
  const { name, email, phone, standardTickets, vipTickets, childTickets } = req.body;

  const data = {
    name,
    email,
    phone,
    standardTickets,
    vipTickets,
    childTickets,
  };

  // Save data to a JSON file (customize the file path)
  const dataFilePath = 'data.json';
  fs.readFile(dataFilePath, (err, fileData) => {
    if (err) {
      const jsonData = [data];
      fs.writeFileSync(dataFilePath, JSON.stringify(jsonData));
    } else {
      const jsonData = JSON.parse(fileData);
      jsonData.push(data);
      fs.writeFileSync(dataFilePath, JSON.stringify(jsonData));
    }
  });

  // Send an email to admin (customize recipient address)
  const mailOptions = {
    from: secrets.email,
    to: 'malik@mastermindsyyx.xyz', // Change this to the admin's email
    subject: 'New Ticket Purchase',
    text: `Name: ${name}\nEmail: ${email}\nPhone: ${phone}\nStandard Tickets: ${standardTickets}\nVIP Tickets: ${vipTickets}\nChild Tickets: ${childTickets}`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log('Email not sent:', error);
    } else {
      console.log('Email sent:', info.response);
    }
  });

  // Respond with a confirmation or redirect to a thank you page
  res.send('Thank you for your purchase!');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
