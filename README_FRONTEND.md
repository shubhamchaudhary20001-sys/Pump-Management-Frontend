# Petrol Management Frontend

A modern React frontend application for managing fuel/petrol station operations. This application provides a user-friendly interface to interact with the petrol management backend API.

## Features

- **Dashboard Overview**: Real-time statistics and quick actions
- **Organization Management**: Create and manage organizations
- **User Management**: Admin and employee user management with automatic organization assignment
- **Fuel Inventory**: Manage fuel types, rates, and pricing
- **Transaction Management**: Record and track fuel transactions with automatic price calculation
- **Responsive Design**: Works on desktop and mobile devices
- **Real-time Updates**: Live data synchronization with the backend

## Tech Stack

- **React 18**: Modern React with hooks
- **Axios**: HTTP client for API communication
- **CSS3**: Custom styling with responsive design
- **React Router**: Client-side routing (future enhancement)

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Running backend server (see backend README)

### Installation

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── Navbar.js              # Navigation component
│   │   ├── Dashboard.js           # Main dashboard with stats
│   │   ├── Organizations.js       # Organization CRUD interface
│   │   ├── Users.js               # User management interface
│   │   ├── Fuels.js               # Fuel inventory management
│   │   ├── Transactions.js        # Transaction management
│   │   └── *.css                  # Component stylesheets
│   ├── App.js                     # Main application component
│   ├── App.css                    # Global styles
│   └── index.js                   # Application entry point
├── public/
└── package.json
```

## API Integration

The frontend communicates with the backend API running on `http://localhost:5000`. Make sure the backend server is running before using the frontend.

### Key API Endpoints Used:

- `GET /api/organisations` - Fetch organizations
- `POST /api/organisations` - Create organization
- `GET /api/users` - Fetch users
- `POST /api/users` - Create user (auto-creates organization if needed)
- `GET /api/fuels` - Fetch fuel types
- `POST /api/fuels` - Create fuel type
- `GET /api/data` - Fetch transactions
- `POST /api/data` - Create transaction (auto-calculates total price)

## Usage Guide

### Dashboard
- View real-time statistics for organizations, users, fuels, and transactions
- Use quick action buttons to navigate to different sections

### Managing Organizations
1. Click "Organizations" in the navigation
2. Click "+ Add Organization" to create a new organization
3. Fill in the organization name and creator details
4. Use Edit/Delete buttons to modify existing organizations

### Managing Users
1. Click "Users" in the navigation
2. Click "+ Add User" to create a new user
3. Fill in user details (organization is optional - will auto-create if empty)
4. Select role: Admin, Manager, or Employee
5. Use Edit/Delete buttons to modify existing users

### Managing Fuels
1. Click "Fuels" in the navigation
2. Click "+ Add Fuel" to create a new fuel type
3. Set fuel name, rate per unit, unit type, and price
4. Use Edit/Delete buttons to modify existing fuels

### Managing Transactions
1. Click "Transactions" in the navigation
2. Click "+ Add Transaction" to record a new transaction
3. Select fuel type, user, organization, and quantity
4. Total price is automatically calculated as `quantity × fuel rate`
5. Use Edit/Delete buttons to modify existing transactions

## Features in Detail

### Automatic Organization Creation
When creating a user without specifying an organization, the system automatically creates a new organization with the name "[Firstname] [Lastname]'s Organization".

### Automatic Price Calculation
Transaction totals are automatically calculated using the formula: `quantity × fuel_rate`. This ensures data accuracy and prevents manual calculation errors.

### Audit Trail
All records include creation and modification timestamps, along with user information for accountability.

### Responsive Design
The interface adapts to different screen sizes, making it usable on desktop, tablet, and mobile devices.

## Development

### Available Scripts

- `npm start` - Runs the app in development mode
- `npm run build` - Builds the app for production
- `npm test` - Launches the test runner
- `npm run eject` - Ejects from Create React App (irreversible)

### Code Style

- Uses modern React hooks (useState, useEffect)
- Follows component-based architecture
- Implements proper error handling
- Uses semantic HTML and accessible design

## Contributing

1. Follow the existing code structure and naming conventions
2. Test all changes with the backend API
3. Ensure responsive design works on all screen sizes
4. Add proper error handling for API calls

## Troubleshooting

### Backend Connection Issues
- Ensure the backend server is running on `http://localhost:5000`
- Check browser console for CORS or network errors
- Verify API endpoints match between frontend and backend

### Data Not Loading
- Check browser network tab for failed requests
- Verify backend database connection
- Ensure proper data format in API responses

### Form Submission Errors
- Check required fields are filled
- Verify data types match API expectations
- Check browser console for validation errors

## Future Enhancements

- User authentication and authorization
- Real-time notifications
- Advanced reporting and analytics
- File upload for organization logos
- Bulk data import/export
- Mobile app version