
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const app = express();
app.use(cookieParser());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.json());




app.get('/api/ticket/:ticketId', (req, res) => {
    const tickets = JSON.parse(fs.readFileSync('tickets.json'));
    const ticketId = req.params.ticketId;
    const ticket = tickets.find((ticket) => ticket.id === ticketId);
  
    if (!user) {
      console.log('ticket not found');
      return res.status(404).json({ error: 'Ticket not found' });
    }
  
    const { id, date, email, livestreamurl} = ticket;
    const ticketProfile = { id, date, email, livestreamurl };
  
    res.json(ticketProfile);
  });

  app.post('/api/registershow', (req, res) => {
    const newRegister = req.body;
  
    // Read the upcoming missions from the JSON file
    const upcomingRegister = JSON.parse(fs.readFileSync('tickets.json'));
  
    // Assign a unique ID to the new mission
    newRegister.id = uuidv4();
  
    // Add the new mission to the upcoming missions array
    upcomingRegister.push(newRegister);
  
    // Save the updated upcoming missions array to the JSON file
    fs.writeFileSync('tickets.json', JSON.stringify(upcomingRegister, null, 2));
  
    res.json({ message: 'Registration added successfully', register: newRegister });
  });
  // Start the server
app.listen(80, () => {
    console.log('Server is running on http://localhost:80');
  });