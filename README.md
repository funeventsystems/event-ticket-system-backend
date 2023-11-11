# API Endpoints

This document lists the available API endpoints for the Masterminds application. Each endpoint is followed by a brief description of what it does and the information it requires.

## Admin Panel

### 1. `/admin`

- Description: Serve the admin panel.
- Information Required: None.

## Styles

### 2. `/styles`

- Description: Serve the CSS styles.
- Information Required: None.

## Check Page

### 3. `/check`

- Description: Serve the main check page.
- Information Required: None.

## Request Page

### 4. `/request`

- Description: Serve the request page.
- Information Required: None.

## Check-In Page

### 5. `/checkin`

- Description: Serve the check-in page.
- Information Required: None.

## Edit Ticket Page

### 6. `/edit`

- Description: Serve the edit ticket page.
- Information Required: None.

## Purchase Tickets

### 7. `/purchase`

- Description: Handles the purchase of tickets and sends a confirmation email to the user.
- Information Required: 
  - `name`: User's name.
  - `email`: User's email address.
  - `phone`: User's phone number.
  - `standardTickets`: Number of standard tickets purchased.
  - `vipTickets`: Number of VIP tickets purchased.
  - `childTickets`: Number of child tickets purchased.

## API Endpoints for Ticket Information

### 8. `/api/tickets-html`

- Description: Returns an HTML list of ticket information sorted by show.
- Information Required: None.

### 9. `/api/ticket/:ticketId`

- Description: Returns detailed information for a specific ticket.
- Information Required: `ticketId` - The ID of the ticket to retrieve.

### 10. `/api/registershow`

- Description: Registers new show tickets and generates unique access IDs. It also queues the generation and email sending process.
- Information Required: 
  - `amount`: Number of tickets to register.
  - Other details provided in the request body.

### 11. `/api/verifyticket/:ticketId`

- Description: Marks a ticket as used, indicating it has been verified.
- Information Required: `ticketId` - The ID of the ticket to verify.

## Edit Ticket

### 12. `/edit-ticket`

- Description: Serve the edit ticket page.
- Information Required: None.

### 13. `/api/edit-ticket`

- Description: Edits the details of a specific ticket.
- Information Required: 
  - `ticketId`: The ID of the ticket to edit.
  - `date`: New date for the ticket.
  - `email`: New email address for the ticket.
  - `livestreamurl`: New livestream URL.

## Note

- All dates are expected in the format 'YYYY-MM-DD'.
- All endpoints are hosted on `http://localhost:8000` for a local environment.

This document provides an overview of the API endpoints available in the Masterminds application, their purposes, and the required information to interact with them.

> Note: Ensure you have the necessary dependencies and configuration files in place to run the application successfully.

