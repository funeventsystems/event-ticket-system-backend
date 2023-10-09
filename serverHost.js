const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');

const path = require('path');
const cookieParser = require('cookie-parser');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const BWIP = require('bwip-js');
const PDFDocument = require('pdfkit'); // Import PDFKit for PDF generation
const JsBarcode = require('jsbarcode'); // Import the jsbarcode library
const stream = require('stream');
const axios = require('axios');

const app = express();
app.use(cookieParser());
app.use(bodyParser.json());
const staticDir = path.join(__dirname, 'public');
const secrets = require('./secrets.json'); // Load email credentials

app.use(express.static(staticDir));

app.get('/', (req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});
app.get('/admin', (req, res) => {
  res.sendFile(path.join(staticDir, 'home.html'));
});
app.get('/verify', (req, res) => {
  res.sendFile(path.join(staticDir, 'verify.html'));
});
app.get('/admins', (req, res) => {
  res.sendFile(path.join(staticDir, 'admin.html'));
});
app.get('/edit', (req, res) => {
  res.sendFile(path.join(staticDir, 'edit-ticket.html'));
});
let isProcessing = false;
const requestQueue = [];

async function processQueue() {
  if (isProcessing) {
    return;
  }

  isProcessing = true;

  while (requestQueue.length > 0) {
    const request = requestQueue.shift();
    try {
      await request.handler();
    } catch (error) {
      console.error('Error processing request:', error);
    }
  }

  isProcessing = false;
}
app.get('/api/tickets-html', (req, res) => {
  const rawData = fs.readFileSync('tickets.json');
  const tickets = JSON.parse(rawData);

  // Sort tickets by date and show
  tickets.sort((a, b) => {
    if (a.show === b.show) {
      return a.date.localeCompare(b.date);
    }
    return a.show.localeCompare(b.show);
  });

  let currentShow = '';
  let htmlContent = '<html><head><style>';
  htmlContent += '/* Add your CSS styling here */';
  htmlContent += '</style></head><body>';

  htmlContent += '<h1>Ticket List by Show</h1>';

  for (const ticket of tickets) {
    if (ticket.show !== currentShow) {
      if (currentShow !== '') {
        htmlContent += '<br>';
      }
      htmlContent += `<h2>Show: ${ticket.show}</h2>`;
      currentShow = ticket.show;
    }
    htmlContent += `<p>Email: ${ticket.email}, Access ID: ${ticket.id}</p>`;
  }

  htmlContent += '</body></html>';

  res.setHeader('Content-Type', 'text/html');
  res.send(htmlContent);
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
 const { amount, ...registerData } = req.body;

  if (!Number.isInteger(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Invalid ticket amount' });
  }

  const upcomingRegister = JSON.parse(fs.readFileSync('tickets.json'));
  const uniqueIds = [];

  for (let i = 0; i < amount; i++) {
    const uniqueId = generateUniqueId(6);
    uniqueIds.push(uniqueId);

    const newRegister = { ...registerData, id: uniqueId };

    if (newRegister.date === '2024-5-15') {
      newRegister.livestreamurl = 'https://youtube.com';
    }
    if (newRegister.date === '2024-5-16') {
      newRegister.livestreamurl = 'show2.url';
    }

    upcomingRegister.push(newRegister);
  }

  fs.writeFileSync('tickets.json', JSON.stringify(upcomingRegister, null, 2));
  res.json({ message: 'Registrations added successfully', uniqueIds });

  // Queue the generation and email sending process
  requestQueue.push({
    handler: async () => {
      const pdfFolderPath = path.join(__dirname, 'pdfs'); // Specify the folder where PDFs will be saved
const pdfFilePath = await generatePDF(uniqueIds, pdfFolderPath);

      await sendEmail(registerData, pdfBuffer, uniqueIds);
    },
  });
requestQueue.push({
  handler: async () => {
    const pdfFolderPath = path.join(__dirname, 'pdfs'); // Specify the folder where PDFs will be saved
    const pdfFilePath = await generatePDF(uniqueIds, pdfFolderPath);
    await sendEmail(registerData, pdfFilePath, uniqueIds);
  },
});
  processQueue(); // Start processing the queue
});

async function generatePDF(uniqueIds, pdfFolderPath) {
  const doc = new PDFDocument();

  // Create a write stream for the PDF file
  const pdfFileName = `${uniqueIds[0]}.pdf`; // Assuming you want to use the first unique ID as the file name
  const pdfFilePath = path.join(pdfFolderPath, pdfFileName);
  const pdfStream = fs.createWriteStream(pdfFilePath);

  // Pipe the PDF content to the write stream
  doc.pipe(pdfStream);

  // Create a promise to handle PDF generation
  const pdfBufferPromise = new Promise(async (resolve, reject) => {
    const pdfBuffer = [];
    doc.on('data', (chunk) => pdfBuffer.push(chunk));
    doc.on('end', () => {
      const pdfBufferConcatenated = Buffer.concat(pdfBuffer);
      fs.writeFileSync(pdfFilePath, pdfBufferConcatenated); // Save the PDF to the specified folder
      resolve(pdfBufferConcatenated);
    });
    doc.on('error', reject);

    let currentPage = 1;
    const maxBarcodesPerPage = 3;
    const barcodeSpacing = 20;
    const barcodeWidth = 150;
    let barcodeCount = 0;

    // Function to add a new page
    function addNewPage() {
      doc.addPage();
      currentPage++;
      barcodeCount = 0;
    }

    // Add the logo on each page
    function addLogo() {
      doc.image('logo.png', 50, 50, { width: 100 });
    }

    // Add title and show information on each page
    function addTitleAndInfo() {
      doc.fontSize(20).text('MASTERMINDS Show Tickets', 200, 50);
    }

    // Add instructions on how to use the ticket on each page
    function addInstructions() {
      doc.fontSize(12).text('Instructions:');
      doc.fontSize(10).text('1. This ticket grants you access to the MASTERMINDS show, either virtually or in person. You can change your viewing method at any time.', 50, 240);
      doc.fontSize(10).text('2. For date changes or questions, please contact us.', 50, 260);
      doc.fontSize(10).text('3. You can access the livestream (if available) via the provided email link or by using your unique access code on the website.', 50, 280);
      doc.fontSize(10).text('4. Keep this ticket safe; it serves as your receipt for show exchanges.', 50, 300);
    }

    // Function to add a barcode with a delay
    async function addBarcodeWithDelay(barcodeData, x, y, barcodeIndex) {
      const barcodeApiUrl = `https://barcodeapi.org/api/128/${barcodeData}`;

      try {
        if (barcodeCount >= maxBarcodesPerPage) {
          addNewPage();
          addLogo();
          addTitleAndInfo();
          addInstructions();
        }

        if (barcodeCount > 0) {
          doc.translate(0, barcodeSpacing);
        }

        const response = await axios.get(barcodeApiUrl, { responseType: 'arraybuffer' });
        const barcodeImage = response.data;

        doc.image(barcodeImage, x, y, { width: barcodeWidth });

        // Adjust the X-coordinate to place text on the right half of the page
        const textX = 300; // Adjust this value as needed
        doc.text(`Access ID: ${barcodeData}`, textX, y + 20); // Adjust Y-coordinate and text as needed

        barcodeCount++;

        // Log the generated barcode and its position
        console.log(`Generated Barcode ${barcodeIndex + 1} of ${uniqueIds.length}: ${barcodeData}`);

        // Delay for a moment before adding the next barcode
        await new Promise((resolve) => setTimeout(resolve, 1000)); // 1-second delay
      } catch (error) {
        console.error('Error:', error);
        reject(error); // Reject the promise if an error occurs
      }
    }

    // Initial setup for the first page
    addLogo();
    addTitleAndInfo();
    addInstructions();

    for (let i = 0; i < uniqueIds.length; i++) {
      const barcodeData = uniqueIds[i];
      const x = 450;
      const y = 200 + (barcodeCount * (barcodeSpacing + barcodeWidth));

      await addBarcodeWithDelay(barcodeData, x, y, i);
    }

    // End document creation
    doc.end();
  });

  // Wait for the PDF generation to complete and return the promise
  return pdfBufferPromise;
}





app.post('/api/verifyticket/:ticketId', (req, res) => {
  const ticketId = req.params.ticketId;

  // Read the JSON data from the 'tickets.json' file
  const rawData = fs.readFileSync('tickets.json');
  
  // Parse the JSON data into an array
  const tickets = JSON.parse(rawData);

  // Find the ticket with the given ID
  const ticketIndex = tickets.findIndex((ticket) => ticket.id === ticketId);

  if (ticketIndex === -1) {
    console.log('Ticket not found');
    return res.status(404).json({ error: 'Ticket not found' });
  }

  // Check if the ticket has already been used
  if (tickets[ticketIndex].used) {
    console.log('Ticket already used');
    return res.status(400).json({ error: 'Ticket already used' });
  }

  // Mark the ticket as used permanently by setting the 'used' property to 'true'
  tickets[ticketIndex].used = true;

  // Save the updated ticket data back to 'tickets.json'
  fs.writeFileSync('tickets.json', JSON.stringify(tickets, null, 2));

  res.json({ message: 'Ticket verified and marked as used successfully' });
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





async function sendEmail(registerData, pdfBuffer, uniqueIds) {
  const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: secrets.email, // Use email from secrets.json
      pass: secrets.password, // Use password from secrets.json
    },
  });

  // Use the unique access ID from the argument
  const uniqueId = uniqueIds[0]; // Assuming you want the first ID

  const htmlContent = `
    <html>
      <head>
        <style>
          /* Add any CSS styling you want for your email here */
        </style>
      </head>
      <body>
        <p>Thank you for registering MASTERMINDS. Your unique access ID is: ${uniqueId}.</p>
        <p>Your selected date is: ${registerData.date}</p>
        <p> The livestream starts at 7:00 PM, with the waiting room opening at 6:30 PM</p>
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
app.get('/edit-ticket', (req, res) => {
    res.sendFile(path.join(staticDir, 'edit-ticket.html'));
});

app.post('/api/edit-ticket', (req, res) => {
    const { ticketId, date, email, livestreamurl } = req.body;

    // Read the JSON data from the 'tickets.json' file
    const rawData = fs.readFileSync('tickets.json');

    // Parse the JSON data into an array
    const tickets = JSON.parse(rawData);

    // Find the ticket with the given ID
    const ticketIndex = tickets.findIndex((ticket) => ticket.id === ticketId);

    if (ticketIndex === -1) {
        console.log('Ticket not found');
        return res.status(404).json({ error: 'Ticket not found' });
    }

    // Update the ticket data
    tickets[ticketIndex].date = date;
    tickets[ticketIndex].email = email;
    tickets[ticketIndex].livestreamurl = livestreamurl;

    // Save the updated ticket data back to 'tickets.json'
    fs.writeFileSync('tickets.json', JSON.stringify(tickets, null, 2));

    res.json({ message: 'Ticket updated successfully' });
});


// ...



// ...



// Start the server
const PORT = 8000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
