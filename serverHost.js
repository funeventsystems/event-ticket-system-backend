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

app.use(express.static(staticDir));

app.get('/', (req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
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
  const uniqueId = generateUniqueId(15);
  newRegister.id = uniqueId;

  if (newRegister.date === '1') {
    newRegister.livestreamurl = 'https://youtube.com';
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

    doc.text(`Access ID: ${registerData.id}`);
    doc.text(`Selected Date: ${registerData.date}`);
    // Add more information as needed

    doc.end();
  });
    return pdfBufferPromise;
}
async function sendEmail(registerData, pdfBuffer) {
  const transporter = nodemailer.createTransport({
    service: 'your-email-service-provider',
    auth: {
      user: 'your-email@gmail.com',
      pass: 'your-email-password',
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
        <p>This can be used on the MASTERMINDS digital ticket page, <a href="https://online.mastermindsshow.com">online.mastermindsshow.com</a>.</p>
        <p><strong>If for whatever reason you need to have the date changed, or can no longer come please email us.</strong></p>
        <a href="mailto:contact@show.com">Contact@show.com</a>
        
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
