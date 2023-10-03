const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const cookieParser = require('cookie-parser');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const PDFDocument = require('pdfkit'); // Import PDFKit for PDF generation

const app = express();
app.use(cookieParser());
app.use(bodyParser.json());
const staticDir = path.join(__dirname, 'public');
const secrets = require('./secrets.json'); // Load email credentials

app.use(express.static(staticDir));

app.get('/', (req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});
app.get('/home', (req, res) => {
  res.sendFile(path.join(staticDir, 'home.html'));
});


app.get('/api/ticket/:ticketId', (req, res) => {
  // Read the JSON data from the 'tickets.json' file
  const rawData = fs.readFileSync('tickets.json');
  
  // Parse the JSON data into an array
  const tickets = JSON.parse(rawData);

  const ticketId = req.params.ticketId;
  const ticket = tickets.find((ticket) => ticket.id === ticketId);

  if (!ticket) {
    console.log('Ticket not found');
    return res.status(404).json({ error: 'Ticket not found' });
  }

  const { id, date, email, livestreamurl } = ticket;
  const ticketProfile = { id, date, email, livestreamurl };

  res.json(ticketProfile);
});


app.post('/api/registershow', async (req, res) => {
  const newRegister = req.body;
  const upcomingRegister = JSON.parse(fs.readFileSync('tickets.json'));
  const uniqueId = generateUniqueId(6);
  newRegister.id = uniqueId;

  if (newRegister.date === '2024-5-15') {
    newRegister.livestreamurl = 'https://youtube.com';
  }
  if (newRegister.date === '2024-5-16') {
    newRegister.livestreamurl = 'show2.url';
  }

  upcomingRegister.push(newRegister);
  fs.writeFileSync('tickets.json', JSON.stringify(upcomingRegister, null, 2));

  // Generate PDF and send email
  try {
    const pdfBuffer = await generatePDF(newRegister);
    await sendEmail(newRegister, pdfBuffer);

    res.json({ message: 'Registration added successfully', register: newRegister });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'An error occurred while sending the email' });
  }
});

// Function to generate a unique ID
function generateUniqueId(length) {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, charset.length);
    id += charset.charAt(randomIndex);
  }
  return id;
}
async function generatePDF(registerData) {
  const doc = new PDFDocument();
  const pdfBufferPromise = new Promise((resolve, reject) => {
    const pdfBuffer = [];
    doc.on('data', (chunk) => pdfBuffer.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(pdfBuffer)));
    doc.on('error', reject);

    // Add an image for the show's logo
    doc.image('mastermindsbook.jpg', 50, 50, { width: 100 });

    // Title and show information
    doc.fontSize(20).text('MASTERMINDS Show Ticket', 200, 50);
    doc.fontSize(12).text(`Access ID: ${registerData.id}`);
    doc.fontSize(12).text(`Selected Date: ${registerData.date}`);

    // Contact information
    doc.fontSize(12).text('Contact Information:');
    doc.fontSize(10).text('Email: contact@mastermindsshow.com', 50, 150);
    doc.fontSize(10).text('Phone: +1 (403) 5XX-XXXX', 50, 170);

    // Instructions on how to use the ticket
    doc.fontSize(12).text('Instructions:');
    doc.fontSize(10).text('1. This ticket grants you access to the MASTERMINDS virtual show.', 50, 220);
    doc.fontSize(10).text('2. If you need to change the date or have any questions, please contact us.', 50, 240);
    doc.fontSize(10).text('3. You can join the livestream (if available) using the link provided in the email, or by looking up your unique access code on the website.', 50, 260);
    doc.fontSize(10).text('4. Keep this ticket safe, it is considered to be your receipt if you need to exchange shows.', 50, 280);

    doc.end();
  });

  return pdfBufferPromise;
}

async function sendEmail(registerData, pdfBuffer) {
  const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: secrets.email, // Use email from secrets.json
      pass: secrets.password, // Use password from secrets.json
    },
  });

  const htmlContent = `
    <html>
      <head>
        <style>
          /* Add any CSS styling you want for your email here */
        </style>
      </head>
      <body>
        <p>Thank you for registering MASTERMINDS. Your unique access ID is: ${registerData.id}.</p>
        <p>Your selected date is: ${registerData.date}</p>
        <p> The livestream starts a 7:00, with the waiting room opening at 6:30 PM</p>
        <p>This can be used on the MASTERMINDS digital ticket page, <a href="https://online.mastermindsshow.com">online.mastermindsshow.com</a>.</p>
        <p><strong>If for whatever reason you need to have the date changed, or can no longer come please email us.</strong></p>
        <a href="mailto:contact@show.com">Contact@show.com</a>
        <p> All times are displayed in Mountain Time </p>
        <p> Enjoy the show! - Masterminds Team</p>
        
        <!-- Check if there is a livestream URL and include it in the email -->
        ${registerData.livestreamurl ? `<p>Join the livestream <a href="${registerData.livestreamurl}">here</a>.</p>` : ''}
      </body>
    </html>
  `;

  const mailOptions = {
    from: 'your-email@gmail.com',
    to: registerData.email,
    subject: 'Registration Confirmation',
    html: htmlContent,
    attachments: [
      {
        filename: 'DigitalID.pdf',
        content: pdfBuffer,
      },
    ],
  };

  await transporter.sendMail(mailOptions);
}


// Start the server
const PORT = 8000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
