# HemoLink

HemoLink is a real-time blood donation and emergency request platform designed to connect donors and receivers quickly during medical emergencies. The system allows patients or hospitals to raise blood requests, notifies compatible donors instantly, and enables donors to respond with availability and contact details.

It is built with a React frontend, an Express + MySQL backend, JWT-based authentication, direct email alerts, cloud document uploads, and a public request view for emergency sharing.

## Overview


HemoLink helps bridge the gap between urgent blood needs and available donors by providing:

- Role-based accounts for donors and receivers
- Secure signup/login with JWT authentication
- Donor profile and availability management
- Receiver blood request creation and matching logic
- Publicly shareable emergency request pages
- Notification and email alerts for compatible donors and responders
- Medical document upload support via Cloudinary or local fallback
- Password reset flow with verification codes
- Responsive dashboard and user roles in React

## Key Features

### For Donors

- Create and update donor profile details
- Mark availability as active or inactive
- View open emergency requests matching urgent blood needs
- Respond to blood requests with a message
- Track donation history
- Receive email alerts for compatible emergency broadcasts

### For Receivers

- Create and update receiver profile details
- Search for available donors by blood group and city
- Submit emergency blood requests with hospital, urgency, and notes
- Attach a doctor prescription or medical document
- Receive donor responses and notifications
- View matching donors and direct donor response data
- Broadcast emergency alerts to relevant blood group matches

### Public Access

- View a public emergency request page by request ID
- Share a request link to mobilize support quickly

### System Services

- JWT authentication with role-based access
- MySQL database integration via mysql2
- Nodemailer-based email alerts for signup, password reset, donor responses, and critical blood requests
- Cloudinary-managed document storage with fallback to local uploads
- Blood compatibility calculations for matching compatible blood groups

---

## Tech Stack

### Frontend

- React 19
- Vite
- React Router DOM
- Lucide React
- Custom CSS styling and reusable UI components

### Backend

- Node.js
- Express.js
- MySQL 2
- JWT
- bcryptjs
- multer
- nodemailer
- Cloudinary
- dotenv

### Database

- MySQL database named hemolink
- Tables are expected for users, donor profiles, receiver profiles, blood requests, donor responses, password resets, and notifications

---

## Project Structure

```text
Hemo_Link/
├── LICENSE
├── backend/
│   ├── .env
│   ├── package.json
│   ├── server.js
│   ├── test_api.js
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── donor.controller.js
│   │   └── receiver.controller.js
│   ├── middleware/
│   │   └── auth.middleware.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── donor.routes.js
│   │   ├── public.routes.js
│   │   └── receiver.routes.js
│   ├── services/
│   │   ├── cloudinary.service.js
│   │   └── email.service.js
│   ├── uploads/
│   │   └── documents/
│   └── utils/
│       └── bloodCompatibility.js
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   ├── public/
│   └── src/
│       ├── App.jsx
│       ├── index.css
│       ├── main.jsx
│       ├── components/
│       │   ├── common/
│       │   ├── donor/
│       │   ├── receiver/
│       │   └── ui/
│       ├── context/
│       │   ├── AuthContext.jsx
│       │   └── ToastContext.jsx
│       ├── hooks/
│       │   └── useAnimatedCounter.js
│       ├── pages/
│       │   ├── auth/
│       │   ├── donor/
│       │   ├── public/
│       │   └── receiver/
│       ├── services/
│       │   └── api.js
│       └── utils/
│           └── bloodCompatibility.js
└── README.md
```

---

## Backend Architecture

### Entry Point

The backend starts in [backend/server.js](backend/server.js). It configures:

- Express app
- CORS for the frontend origin
- JSON parsing
- Static uploads serving from backend/uploads
- Public and authenticated routes
- Health-check route
- Global 404 and error handlers

### Database Layer

The MySQL connection pool is defined in [backend/config/db.js](backend/config/db.js). It connects to the database using environment values such as DB_HOST, DB_PORT, DB_USER, DB_PASS, and DB_NAME.

### Authentication

Authentication logic is handled via [backend/middleware/auth.middleware.js](backend/middleware/auth.middleware.js):

- verifyToken checks the Authorization: Bearer token header
- requireRole ensures only the correct user type can access protected endpoints

### Controllers

The project separates API logic into controllers:

- [backend/controllers/auth.controller.js](backend/controllers/auth.controller.js): signup, login, password reset, profile completeness, and email actions
- [backend/controllers/donor.controller.js](backend/controllers/donor.controller.js): donor profiles, requests, responses, availability, and history
- [backend/controllers/receiver.controller.js](backend/controllers/receiver.controller.js): receiver profiles, donor search, request creation, notifications, and document uploads

### Routes

- [backend/routes/auth.routes.js](backend/routes/auth.routes.js): unauthenticated auth routes
- [backend/routes/donor.routes.js](backend/routes/donor.routes.js): protected donor routes
- [backend/routes/receiver.routes.js](backend/routes/receiver.routes.js): protected receiver routes
- [backend/routes/public.routes.js](backend/routes/public.routes.js): public request view endpoint

### Utilities and Services

- [backend/utils/bloodCompatibility.js](backend/utils/bloodCompatibility.js): compatibility matrix for blood donation matching
- [backend/services/email.service.js](backend/services/email.service.js): email templates and alert sending system
- [backend/services/cloudinary.service.js](backend/services/cloudinary.service.js): document upload service with local fallback for development

---

## Frontend Architecture

### App Routing

The app uses React Router with a root redirect based on authentication and role in [frontend/src/App.jsx](frontend/src/App.jsx).

Routes include:

- Public login/signup/forgot password/reset password views
- Public emergency request view
- Donor protected routes
- Receiver protected routes

### Auth State

Global authentication state is stored in [frontend/src/context/AuthContext.jsx](frontend/src/context/AuthContext.jsx). It stores:

- JWT token
- current user object
- role and profile completeness status
- login/logout helpers
- persistent localStorage session management

### UI Structure

The frontend is organized by page type:

- Auth pages: login, signup, forgot password, reset password
- Donor dashboard, donor requests, donor history, donor profile
- Receiver dashboard, donor search, request creation, request list, profile
- Public request page

---

## Environment Configuration

A backend environment file exists at [backend/.env](backend/.env). It contains the project configuration for the database, JWT secret, frontend URL, email, and Cloudinary.

Example configuration keys:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASS=none
DB_NAME=hemolink
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=24h
PORT=5000
CLIENT_URL=http://localhost:5173
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_16_digit_app_password
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_FOLDER=Hemo_LInk
```

> Important: Keep sensitive values private. Do not commit live secrets to version control.

---

## Prerequisites

Before running the project, make sure you have:

- Node.js 18+ recommended
- npm or yarn
- MySQL server running locally
- Email app password configured for Gmail SMTP if you want actual email alerts
- Optional Cloudinary credentials for document uploads

---

## Installation and Run Guide

### 1. Clone the repository

```bash
git clone <repository-url>
cd Hemo_Link
```

### 2. Install backend dependencies

```bash
cd backend
npm install
```

### 3. Install frontend dependencies

```bash
cd ../frontend
npm install
```

### 4. Start the MySQL database

Make sure MySQL is running and the database named hemolink is available.

### 5. Start the backend

```bash
cd backend
npm run dev
```

Backend runs on:

```text
http://localhost:5000
```

### 6. Start the frontend

```bash
cd frontend
npm run dev
```

Frontend runs on:

```text
http://localhost:5173
```

---

## Database Notes

The application expects a MySQL database with tables that support:

- users
- donor_profiles
- receiver_profiles
- blood_requests
- donor_responses
- notifications
- password_resets

The app uses direct SQL queries in controllers to manage requests, responses, profiles, and alerts.

---

## API Highlights

### Auth APIs

- POST /api/auth/signup
- POST /api/auth/login
- POST /api/auth/forgot-password
- POST /api/auth/reset-password
- GET /api/auth/me

### Donor APIs

- POST /api/donor/profile
- GET /api/donor/profile
- PUT /api/donor/profile
- GET /api/donor/requests
- GET /api/donor/requests/:id
- POST /api/donor/respond/:requestId
- GET /api/donor/history
- PUT /api/donor/availability

### Receiver APIs

- POST /api/receiver/profile
- GET /api/receiver/profile
- PUT /api/receiver/profile
- GET /api/receiver/donors
- POST /api/receiver/requests
- GET /api/receiver/requests
- GET /api/receiver/requests/:id/responses
- PUT /api/receiver/requests/:id
- DELETE /api/receiver/requests/:id
- GET /api/receiver/notifications
- POST /api/receiver/requests/upload-doc

### Public API

- GET /api/public/requests/:id

### Health Check

- GET /api/health

---

## Feature Behavior Summary

### Blood Matching Logic

The app includes logic to determine compatible donor groups based on blood type. This is implemented in [backend/utils/bloodCompatibility.js](backend/utils/bloodCompatibility.js). It helps the system identify donors that can safely help the requester.

### Email Alert System

The backend sends real-time notifications using Gmail SMTP through [backend/services/email.service.js](backend/services/email.service.js). This covers:

- donation request alerts to eligible donors
- donor response alerts to requesters
- welcome emails
- password reset verification emails

If EMAIL_PASS is not configured, the service logs preview information instead of failing the request flow.

### Document Uploads

Medical documents can be uploaded using Cloudinary when configured. If Cloudinary credentials are missing, the app saves the file locally in the backend uploads directory as a fallback.

---

## Security Notes

- JWT-based session protection is used for donor and receiver routes
- Passwords are hashed using bcryptjs before storage
- Role checks restrict donor-only and receiver-only endpoints
- Reset tokens are stored in the database and expire automatically
- Sensitive configuration values should remain in environment variables

---

## Development Scripts

### Backend

```bash
npm start
npm run dev
npm test
```

### Frontend

```bash
npm run dev
npm run build
npm run preview
```

---

## Production Recommendations

Before production deployment, consider:

- using a secure production database host and password management
- enabling HTTPS and secure cookie/session patterns if required
- rotating JWT secrets and email credentials
- setting Cloudinary and Gmail credentials in deployment environment variables
- adding validation and database migrations for production-scale deployment
- restricting CORS to trusted frontend domains
- adding monitoring and logging for request errors

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for more details.

---

## Summary

HemoLink is a full-stack emergency blood coordination platform built to improve response times during critical medical situations. The project combines secure donor/receiver roles, blood matching logic, public request sharing, notification systems, and responsive dashboards to create a valuable healthcare connectivity product.

If you want, the next step can be adding a database schema dump, API documentation, or deployment instructions for Vercel/Render/Netlify.
