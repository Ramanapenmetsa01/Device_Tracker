# 🗺️ Device Tracker - AddWise

A comprehensive device tracking system with real-time location monitoring, user management, and activity logging.

## ✨ Features

### 🔐 Authentication & User Management
- **Multi-role system**: Super Admin, Admin, and User roles
- **Secure authentication** with JWT tokens
- **Email verification** for account security
- **Individual session management** (logout from one account doesn't affect others)
- **Profile management** with image upload functionality

### 📱 Device Management
- **QR code generation** for device IDs
- **Device linking/unlinking** to users
- **Bulk device creation** for admins
- **Device assignment tracking** with timestamps
- **Validation** for duplicate device IDs

### 🗺️ Location Tracking
- **Real-time location tracking** using Leaflet.js maps
- **Path visualization** with start/end markers and intermediate points
- **Location history** with date/time filtering
- **API-based location updates** (URL parameters or JSON)
- **Automatic data cleanup** when devices are unlinked

### 📊 Activity Monitoring
- **Comprehensive activity logging** for all user actions
- **Detailed activity history** with filtering options
- **Clickable activity details** with full information
- **Role-based activity views** (users see their own, admins see admin actions)
- **Real-time activity updates**

### 🎛️ Admin Dashboard
- **User management** (create, delete, block/unblock users)
- **Device management** (create, delete, unlink devices)
- **Statistics overview** (user count, device count, assignments)
- **Activity monitoring** with advanced filtering
- **Profile management** for admins

### 👑 Super Admin Features
- **Complete system oversight** with all admin features
- **Admin account management** (view, delete admins)
- **System-wide statistics** and monitoring
- **Separate admin and user management interfaces

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MySQL database
- Gmail account for email verification

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Ramanapenmetsa01/Device_Tracker.git
   cd Device_Tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your configuration:
   ```env
   HOST=localhost
   USER=root
   PASSWORD=your_database_password
   DATABASE=addwise_db
   GMAIL_USER=your_email@gmail.com
   GMAIL_PASS=your_app_password
   PORT=3000
   JWT_SECRET=your_jwt_secret_key_here
   ```

4. **Set up the database**
   - Create a MySQL database named `addwise_db`
   - The application will automatically create required tables on first run

5. **Start the server**
   ```bash
   npm start
   ```
   or for development:
   ```bash
   node server.js
   ```

6. **Access the application**
   - Open your browser and go to `http://localhost:3000`
   - The super admin account will be created automatically on first run

## 📁 Project Structure

```
Device_Tracker/
├── admin/                  # Admin dashboard files
│   ├── admin-dashboard.html
│   ├── admin-dashboard.js
│   └── admin-style.css
├── user/                   # User dashboard files
│   ├── html/
│   ├── css/
│   └── js/
├── superadmin/            # Super admin dashboard files
├── uploads/               # File uploads (profile images)
├── server.js              # Main server file
├── package.json           # Dependencies
├── .env.example           # Environment variables template
└── README.md              # This file
```

## 🔧 API Endpoints

### Authentication
- `POST /api/login` - User login
- `POST /api/signup` - User registration
- `POST /api/logout` - User logout
- `POST /api/verify-email` - Email verification

### Device Management
- `GET /api/device-ids` - Get all devices
- `POST /api/generate-device-ids` - Create new devices
- `DELETE /api/device-ids/:id` - Delete device
- `POST /api/link-device` - Link device to user
- `POST /api/admin-unlink-device` - Unlink device (admin)

### Location Tracking
- `POST /api/track-location` - Add location data
- `GET /api/device-locations/:deviceId` - Get device locations
- `GET /api/user-trackable-devices` - Get user's trackable devices

### User Management (Admin)
- `GET /api/users` - Get all users
- `DELETE /api/users/:id` - Delete user
- `POST /api/block-user` - Block user
- `POST /api/unblock-user` - Unblock user

## 🛡️ Security Features

- **JWT token authentication** for secure API access
- **Password hashing** using bcrypt
- **Email verification** for account validation
- **Role-based access control** (RBAC)
- **Input validation** and sanitization
- **Environment variable protection** for sensitive data

## 🎨 UI Features

- **Responsive design** for desktop and mobile
- **Interactive maps** with Leaflet.js
- **Real-time updates** without page refresh
- **Modal dialogs** for detailed information
- **Activity filtering** with date ranges
- **Profile image uploads** with preview

## 📱 Mobile Support

- Responsive design works on all screen sizes
- Touch-friendly interface for mobile devices
- Optimized map interactions for touch screens

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Ramana Penmetsa**
- GitHub: [@Ramanapenmetsa01](https://github.com/Ramanapenmetsa01)

## 🙏 Acknowledgments

- Leaflet.js for mapping functionality
- Font Awesome for icons
- Node.js and Express.js for backend
- MySQL for database management
