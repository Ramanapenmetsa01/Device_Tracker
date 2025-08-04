const express = require('express');
const mysql = require('mysql');
const path = require('path');
const bcrypt = require('bcrypt'); 
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const app = express();
const dotenv=require("dotenv")
const PORT = process.env.PORT || 3000;
const multer = require('multer');
const fs = require('fs');
const qrcode = require('qrcode-generator');
//  MySQL connection
dotenv.config()
const db = mysql.createConnection({
    host: process.env.HOST,
    user: process.env.USER,
    password: process.env.PASSWORD,
    database: process.env.DATABASE
});

// Function to update device_ids table structure
function updateDeviceIdsTable() {
    // Check if assigned_to column exists, if not add it
    db.query(`SHOW COLUMNS FROM device_ids LIKE 'assigned_to'`, (err, results) => {
        if (err) {
            console.error('Error checking assigned_to column:', err);
            return;
        }

        if (results.length === 0) {
            // Column doesn't exist, add it
            db.query(`ALTER TABLE device_ids ADD COLUMN assigned_to VARCHAR(255) DEFAULT NULL`, (err) => {
                if (err) {
                    console.error('Error adding assigned_to column:', err);
                } else {
                    console.log('assigned_to column added to device_ids table');
                }
            });
        }
    });

    // Check if assigned_at column exists, if not add it
    db.query(`SHOW COLUMNS FROM device_ids LIKE 'assigned_at'`, (err, results) => {
        if (err) {
            console.error('Error checking assigned_at column:', err);
            return;
        }

        if (results.length === 0) {
            // Column doesn't exist, add it
            db.query(`ALTER TABLE device_ids ADD COLUMN assigned_at TIMESTAMP NULL DEFAULT NULL`, (err) => {
                if (err) {
                    console.error('Error adding assigned_at column:', err);
                } else {
                    console.log('assigned_at column added to device_ids table');
                }
            });
        }
    });

    // Check if is_active column exists, if yes remove it
    db.query(`SHOW COLUMNS FROM device_ids LIKE 'is_active'`, (err, results) => {
        if (err) {
            console.error('Error checking is_active column:', err);
            return;
        }

        if (results.length > 0) {
            // Column exists, remove it
            db.query(`ALTER TABLE device_ids DROP COLUMN is_active`, (err) => {
                if (err) {
                    console.error('Error removing is_active column:', err);
                } else {
                    console.log('is_active column removed from device_ids table');
                }
            });
        }
    });

    // Check if status column exists in users table, if not add it
    db.query(`SHOW COLUMNS FROM users LIKE 'status'`, (err, results) => {
        if (err) {
            console.error('Error checking status column:', err);
            return;
        }

        if (results.length === 0) {
            // Column doesn't exist, add it
            db.query(`ALTER TABLE users ADD COLUMN status ENUM('active', 'blocked') DEFAULT 'active'`, (err) => {
                if (err) {
                    console.error('Error adding status column:', err);
                } else {
                    console.log('status column added to users table');
                }
            });
        }
    });

    // Check if bio column exists in users table, if not add it
    db.query(`SHOW COLUMNS FROM users LIKE 'bio'`, (err, results) => {
        if (err) {
            console.error('Error checking bio column:', err);
            return;
        }

        if (results.length === 0) {
            // Column doesn't exist, add it
            db.query(`ALTER TABLE users ADD COLUMN bio TEXT`, (err) => {
                if (err) {
                    console.error('Error adding bio column:', err);
                } else {
                    console.log('bio column added to users table');
                }
            });
        }
    });

    // Check if profile_image column needs to be enlarged for base64 data
    db.query(`SHOW COLUMNS FROM users LIKE 'profile_image'`, (err, results) => {
        if (err) {
            console.error('Error checking profile_image column:', err);
            return;
        }

        if (results.length > 0) {
            // Column exists, check if it's LONGTEXT
            const columnType = results[0].Type;
            if (columnType !== 'longtext') {
                // Update to LONGTEXT for base64 images
                db.query(`ALTER TABLE users MODIFY COLUMN profile_image LONGTEXT`, (err) => {
                    if (err) {
                        console.error('Error updating profile_image column:', err);
                    } else {
                        console.log('profile_image column updated to LONGTEXT');
                    }
                });
            }
        }
    });

    // Create device_locations table for tracking
    const createLocationTableQuery = `
        CREATE TABLE IF NOT EXISTS device_locations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            device_id VARCHAR(255) NOT NULL,
            user_email VARCHAR(255) NOT NULL,
            latitude DECIMAL(10, 8) NOT NULL,
            longitude DECIMAL(11, 8) NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_device_id (device_id),
            INDEX idx_user_email (user_email),
            INDEX idx_timestamp (timestamp),
            FOREIGN KEY (device_id) REFERENCES device_ids(device_id) ON DELETE CASCADE
        )
    `;

    db.query(createLocationTableQuery, (err) => {
        if (err) {
            console.error('Error creating device_locations table:', err);
        } else {
            console.log('device_locations table created or already exists');
        }
    });

    // Create activity_logs table for audit trail
    const createActivityLogsTable = `
        CREATE TABLE IF NOT EXISTS activity_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_email VARCHAR(255) NOT NULL,
            user_role ENUM('user', 'admin', 'superadmin') NOT NULL,
            action_type ENUM('login', 'logout', 'device_create', 'device_delete', 'device_link', 'device_unlink', 'user_create', 'user_delete', 'user_block', 'user_unblock', 'profile_update', 'password_change') NOT NULL,
            action_description TEXT NOT NULL,
            target_entity VARCHAR(255) NULL,
            ip_address VARCHAR(45) NULL,
            user_agent TEXT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_user_timestamp (user_email, timestamp),
            INDEX idx_action_timestamp (action_type, timestamp),
            INDEX idx_role_timestamp (user_role, timestamp)
        )
    `;

    db.query(createActivityLogsTable, (err) => {
        if (err) {
            console.error('Error creating activity_logs table:', err);
        } else {
            console.log('activity_logs table created or already exists');

            // Add missing admin activity types to enum if they don't exist
            const alterActivityLogsTable = `
                ALTER TABLE activity_logs
                MODIFY COLUMN action_type ENUM(
                    'login', 'logout', 'device_create', 'device_delete', 'device_link', 'device_unlink',
                    'user_create', 'user_delete', 'user_block', 'user_unblock',
                    'admin_delete', 'admin_block', 'admin_unblock',
                    'profile_update', 'password_change'
                ) NOT NULL
            `;

            db.query(alterActivityLogsTable, (alterErr) => {
                if (alterErr) {
                    console.log('Activity logs enum already up to date or error updating:', alterErr.message);
                } else {
                    console.log('Activity logs enum updated with admin activity types');
                }
            });
        }
    });
    db.query(createActivityLogsTable, (err) => {
        if (err) {
            console.error('Error creating activity_logs table:', err);
        } else {
            console.log('activity_logs table created or already exists');

            // Add missing admin activity types to enum if they don't exist
            const alterActivityLogsTable = `
                ALTER TABLE activity_logs MODIFY user_role ENUM('user', 'admin', 'super-admin') NOT NULL`;

            db.query(alterActivityLogsTable, (alterErr) => {
                if (alterErr) {
                    console.log('Activity logs enum already up to date or error updating:', alterErr.message);
                } else {
                    console.log('Activity logs enum updated with admin activity types');
                }
            });
        }
    });

}

// JWT Secret Key
const JWT_SECRET = process.env.JWT_SECRET;
// Helper function to log activities
function logActivity(userEmail, userRole, actionType, actionDescription, targetEntity = null, req = null) {
   
    const ipAddress = req ? (req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || 'unknown') : null;
    const userAgent = req ? req.headers['user-agent'] : null;

    const insertActivityQuery = `
        INSERT INTO activity_logs (user_email, user_role, action_type, action_description, target_entity, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;


    db.query(insertActivityQuery, [userEmail, userRole, actionType, actionDescription, targetEntity, ipAddress, userAgent], (err, result) => {
        if (err) {
            console.error('Error logging activity:', err);
        }
    });
}

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
    // Get token from Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN format
    
    if (!token) {
        return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }
    
    try {
        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ success: false, message: 'Invalid token.' });
    }
};

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname)));

// Route for login
app.post('/login', (req, res) => {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
        return res.status(400).json({ success: false, message: 'Missing email, password, or role' });
    }

    const query = 'SELECT * FROM users WHERE email = ? AND role = ?';
    db.query(query, [email, role], (err, results) => {
        if (err) {
            console.error('Database error during login:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        if (results.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const user = results[0]; 

        // Check if user is blocked (only for regular users, not admins)
        if (role === 'user' && user.status === 'blocked') {
            return res.status(403).json({
                success: false,
                message: 'Your account has been blocked. Please contact the administrator.'
            });
        }
        if (role === 'admin' && user.status === 'blocked') {
            return res.status(403).json({
                success: false,
                message: 'Your account has been blocked. Please contact the super-administrator.'
            });
        }

        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) {
                console.error('Bcrypt error during login:', err);
                return res.status(500).json({ success: false, message: 'Authentication error' });
            }

            if (isMatch) {
                // Generate JWT token
                const token = jwt.sign(
                    { id: user.id, email: user.email, role: user.role },
                    JWT_SECRET,
                    { expiresIn: '24h' }
                );
                
                let redirectUrl;
                if (role === 'user') {
                    redirectUrl = '/user/dashboard.html';
                } else if (role === 'admin') {
                    redirectUrl = '/admin/dashboard.html';
                } else if (role === 'super-admin') {
                    redirectUrl = '/superadmin/dashboard.html';
                }
                
                // Log login activity
                logActivity(user.email, user.role, 'login', `User logged in successfully`, null, req);

                res.json({
                    success: true,
                    redirect: redirectUrl,
                    token: token  // Include token in response
                });
            } else {
                res.status(401).json({ success: false, message: 'Invalid credentials' });
            }
        });
    });
});
//Route for checking for redirecting
app.post("/checking",(req,res)=>{
    const token = req.body.token // Bearer TOKEN format
    if (!token) {
        return res.json({ success: false, message: 'Access denied. No token provided.' });
    }
    try {
        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET);
         res.json({success:true,role:decoded.role})
    } catch (error) {
        res.status(401).json({ success: false, message: 'Invalid token.' });
    }
})
//Route for user logout
app.post('/api/logout', verifyToken, (req, res) => {
    const userEmail = req.user.email;
    const userRole = req.user.role;

    // Log logout activity
    logActivity(userEmail, userRole, 'logout', 'User logged out', null, req);

    res.json({ success: true, message: 'Logged out successfully' });
});
// Route for admin logout
app.post('/api/admin/logout', verifyToken, (req, res) => {
    const userEmail = req.user.email;
    const userRole = req.user.role;

    // Log logout activity
    logActivity(userEmail, userRole, 'logout', 'User logged out', null, req);

    res.json({ success: true, message: 'Logged out successfully' });
});
// Route for super-admin logout

app.post('/api/superadmin/logout', verifyToken, (req, res) => {
    const userEmail = req.user.email;
    const userRole = req.user.role;

    // Log logout activity
    logActivity(userEmail, userRole, 'logout', 'User logged out', null, req);

    res.json({ success: true, message: 'Logged out successfully' });
});


// Route for signup
app.post('/signup', (req, res) => {
    const { name, email, password, role, adminCode } = req.body;

    if (!name || !email || !password || !role) {
        return res.status(400).json({ success: false, message: 'Missing name, email, password, or role' });
    }

    if (role === 'admin' && adminCode !== 'SUPERADMINCODE') {
        return res.status(403).json({ success: false, message: 'Invalid Admin Special Code' });
    }

    const checkUserQuery = 'SELECT COUNT(*) AS count FROM users WHERE email = ?';
    db.query(checkUserQuery, [email], (err, results) => {
        if (err) {
            console.error('Database error during signup check:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        if (results[0].count > 0) {
            return res.status(409).json({ success: false, message: 'Email already registered' });
        }

        // Hash password
        bcrypt.hash(password, 10, (err, hashedPassword) => {
            if (err) {
                console.error('Bcrypt error during hashing:', err);
                return res.status(500).json({ success: false, message: 'Password hashing error' });
            }

            // Insert new user into database
            const insertUserQuery = 'INSERT INTO users (name, email, password, role, admin_code) VALUES (?, ?, ?, ?, ?)';
            const values = [name, email, hashedPassword, role, role === 'admin' ? adminCode : null];
            db.query(insertUserQuery, values, (err, result) => {
                if (err) {
                    console.error('Database error during signup insertion:', err);
                    return res.status(500).json({ success: false, message: 'Database error' });
                }
                res.status(201).json({ success: true, message: 'User registered successfully' });
            });
        });
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Add cache control middleware for dashboard pages
app.use('/admin/dashboard.html', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

app.use('/user/dashboard.html', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

app.use('/superadmin/dashboard.html', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

//  the route for storing device IDs
app.post('/api/device-ids', (req, res) => {
    const { deviceId, qrCodeData, adminEmail } = req.body;
    
    if (!deviceId || !qrCodeData || !adminEmail) {
        return res.status(400).json({ success: false, message: 'Missing deviceId, qrCodeData, or adminEmail' });
    }
    
    // Check if device ID already exists
    const checkQuery = 'SELECT COUNT(*) AS count FROM device_ids WHERE device_id = ?';
    db.query(checkQuery, [deviceId], (err, results) => {
        if (err) {
            console.error('Database error during device ID check:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        if (results[0].count > 0) {
            return res.status(409).json({ success: false, message: 'Device ID already exists' });
        }
        
        // Insert new device ID with admin email
        const insertQuery = 'INSERT INTO device_ids (device_id, qr_code_data, created_by) VALUES (?, ?, ?)';
        db.query(insertQuery, [deviceId, qrCodeData, adminEmail], (err, result) => {
            if (err) {
                console.error('Database error during device ID insertion:', err);
                return res.status(500).json({ success: false, message: 'Database error' });
            }
            
            // Log device creation activity
            logActivity(adminEmail, 'admin', 'device_create', `Created device ${deviceId}`, deviceId, req);

            res.status(201).json({ success: true, message: 'Device ID stored successfully' });
        });
    });
});

//  the route for deleting a device ID
app.delete('/api/device-ids/:id', (req, res) => {
    const deviceId = req.params.id;
    const adminEmail = req.query.adminEmail;
    
    if (!adminEmail) {
        return res.status(400).json({ success: false, message: 'Admin email is required' });
    }

    const checkQuery = 'SELECT * FROM device_ids WHERE device_id = ?';
    db.query(checkQuery, [deviceId], (err, results) => {
        if (err) {
            console.error('Database error while checking device ID:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Device ID not found' });
        }
        
        // Check if the admin is the creator of this device ID
        if (results[0].created_by !== adminEmail) {
            return res.status(403).json({ 
                success: false, 
                message: 'You cannot delete device IDs created by other admins' 
            });
        }
        
        // If admin is the creator, proceed with deletion
        // First delete all location data for this device
        const deleteLocationsQuery = 'DELETE FROM device_locations WHERE device_id = ?';
        db.query(deleteLocationsQuery, [deviceId], (err, locationResult) => {
            if (err) {
                console.error('Database error while deleting device locations:', err);
                return res.status(500).json({ success: false, message: 'Database error' });
            }


            // Then delete the device ID
            const deleteQuery = 'DELETE FROM device_ids WHERE device_id = ?';
            db.query(deleteQuery, [deviceId], (err, result) => {
                if (err) {
                    console.error('Database error while deleting device ID:', err);
                    return res.status(500).json({ success: false, message: 'Database error' });
                }

                // Log device deletion activity (works for both admin and super admin)
                const userRole = req.user.role; // Get actual role from token
                logActivity(adminEmail, userRole, 'device_delete', `Deleted device ${deviceId}`, deviceId, req);

                res.json({
                    success: true,
                    message: 'Device ID and all associated location data deleted successfully',
                    locationsDeleted: locationResult.affectedRows
                });
            });
        });
    });
});

// Route for getting all device IDs with assignment status
app.get('/api/device-ids', (req, res) => {
    const query = `
        SELECT d.*,
               CASE WHEN d.assigned_to IS NOT NULL THEN 'assigned' ELSE 'not_assigned' END as assignment_status,
               creator.name as created_by_name,
               assignee.name as assigned_to_name
        FROM device_ids d
        LEFT JOIN users creator ON d.created_by = creator.email
        LEFT JOIN users assignee ON d.assigned_to = assignee.email
        ORDER BY d.created_at DESC
    `;
    db.query(query, (err, results) => {
        if (err) {
            console.error('Database error while fetching device IDs:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        res.json({ success: true, devices: results });
    });
});

// Route for getting the 2 most recent device IDs
app.get('/api/recent-device-ids', (req, res) => {
    const query = 'SELECT * FROM device_ids ORDER BY created_at DESC LIMIT 2';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Database error while fetching recent device IDs:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        res.json({ success: true, devices: results });
    });
});

// Route for getting all users (for admin dashboard)
app.get('/api/users', (req, res) => {
    const query = "SELECT id, name, email, role, status, created_at FROM users where role='user' ORDER BY created_at DESC";
    db.query(query, (err, results) => {
        if (err) {
            console.error('Database error while fetching users:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        res.json({ success: true, users: results });
    });
});

// Route for getting dashboard statistics
app.get('/api/dashboard-stats', (req, res) => {
    // Get total users, devices, linked devices count
    const userCountQuery = "SELECT COUNT(*) AS userCount FROM users WHERE role='user'";
    const deviceCountQuery = "SELECT COUNT(*) AS deviceCount FROM device_ids";
    const linkedDeviceCountQuery = "SELECT COUNT(*) AS linkedDeviceCount FROM device_ids WHERE assigned_to IS NOT NULL";
    
    db.query(userCountQuery, (err, userResults) => {
        if (err) {
            console.error('Database error while fetching user count:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        // Execute device count query
        db.query(deviceCountQuery, (err, deviceResults) => {
            if (err) {
                console.error('Database error while fetching device count:', err);
                return res.status(500).json({ success: false, message: 'Database error' });
            }
            
            // Execute linked device count query
            db.query(linkedDeviceCountQuery, (err, linkedDeviceResults) => {
                if (err) {
                    console.error('Database error while fetching linked device count:', err);
                    return res.status(500).json({ success: false, message: 'Database error' });
                }

                // Return all statistics
                res.json({
                    success: true,
                    stats: {
                        userCount: userResults[0].userCount,
                        deviceCount: deviceResults[0].deviceCount,
                        linkedDeviceCount: linkedDeviceResults[0].linkedDeviceCount
                    }
                });
            });
        });
    });
});

// Route for getting current admin info
app.get('/api/admin-info', (req, res) => {
    const email = req.query.email;
    
    if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
    }
    
    const query = 'SELECT name FROM users WHERE email = ? AND (role = "admin" OR role = "super-admin")';
    db.query(query, [email], (err, results) => {
        if (err) {
            console.error('Database error while fetching admin info:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Admin not found' });
        }
        
        res.json({ success: true, admin: results[0] });
    });
});

// Route for updating a user
app.put('/api/users/:id', (req, res) => {
    const userId = req.params.id;
    const { name, email, role } = req.body;
    
    if (!name || !email || !role) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    
    const query = 'UPDATE users SET name = ?, email = ?, role = ? WHERE id = ?';
    db.query(query, [name, email, role, userId], (err, result) => {
        if (err) {
            console.error('Database error while updating user:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        res.json({ success: true, message: 'User updated successfully' });
    });
});

// Route for deleting a user
app.delete('/api/users/:id', verifyToken, (req, res) => {
    const userId = req.params.id;
    const adminEmail = req.user.email; // Get admin email from token

    // First, get the user's email to unassign devices
    const getUserQuery = 'SELECT email FROM users WHERE id = ?';
    db.query(getUserQuery, [userId], (err, userResults) => {
        if (err) {
            console.error('Database error while fetching user:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        if (userResults.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const userEmail = userResults[0].email;

        // Unassign all devices assigned to this user
        const unassignDevicesQuery = 'UPDATE device_ids SET assigned_to = NULL, assigned_at = NULL WHERE assigned_to = ?';
        db.query(unassignDevicesQuery, [userEmail], (err, unassignResult) => {
            if (err) {
                console.error('Database error while unassigning devices:', err);
                return res.status(500).json({ success: false, message: 'Database error while unassigning devices' });
            }

            // Delete all activity history for this user
            const deleteActivityQuery = 'DELETE FROM activity_logs WHERE user_email = ?';
            db.query(deleteActivityQuery, [userEmail], (err, activityResult) => {
                if (err) {
                    console.error('Database error while deleting user activity history:', err);
                    return res.status(500).json({ success: false, message: 'Database error while deleting activity history' });
                }

                console.log(`Deleted ${activityResult.affectedRows} activity log records for user ${userEmail}`);

                // Now delete the user
                const deleteUserQuery = 'DELETE FROM users WHERE id = ?';
                db.query(deleteUserQuery, [userId], (err, deleteResult) => {
                    if (err) {
                        console.error('Database error while deleting user:', err);
                        return res.status(500).json({ success: false, message: 'Database error' });
                    }

                    // Log activity for user deletion (works for both admin and super admin)
                    const userRole = req.user.role; // Get actual role from token
                    logActivity(adminEmail, userRole, 'user_delete', `Deleted user ${userEmail}`, userEmail, req);

                    const unassignedCount = unassignResult.affectedRows;
                    const deletedActivityCount = activityResult.affectedRows;
                    let message = 'User deleted successfully';
                    if (unassignedCount > 0) {
                        message += ` and ${unassignedCount} device${unassignedCount > 1 ? 's' : ''} unassigned`;
                    }
                    if (deletedActivityCount > 0) {
                        message += ` and ${deletedActivityCount} activity record${deletedActivityCount > 1 ? 's' : ''} removed`;
                    }
                    
                    res.json({ success: true, message: message });
                });
            });
        });
    });
});


// Create superadmin user if it doesn't exist
function createSuperAdminIfNotExists() {
    const email = 'superadmin@gmail.com';
    const password = '123'; 
    const name = 'Super Admin';
    const role = 'super-admin';
    
    // Check if superadmin exists first
    const checkQuery = 'SELECT * FROM users WHERE email = ?';
    db.query(checkQuery, [email], (checkErr, checkResult) => {
        if (checkErr) {
            console.error('Error checking for existing superadmin:', checkErr);
            return;
        }
        // If superadmin doesn't exist, insert directly
        if (checkResult.length < 0) {
            insertSuperAdmin();
        }
    });
    
    function insertSuperAdmin() {
        bcrypt.hash(password, 10, (err, hashedPassword) => {
            if (err) {
                console.error('Error hashing superadmin password:', err);
                return;
            }
            
            const insertQuery = 'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)';
            db.query(insertQuery, [name, email, hashedPassword, role], (insErr, insResult) => {
                if (insErr) {
                    console.error('Error creating superadmin:', insErr);
                    return;
                }
                console.log('Superadmin user created successfully');
            });
        });
    }
}

//  database connection
db.connect(err => {
    if (err) {
        console.error('Error connecting to MySQL database:', err);
        return;
    }
    console.log('Connected to MySQL database!');

    // Update device_ids table structure
    updateDeviceIdsTable();

    // Create superadmin user
    createSuperAdminIfNotExists();
});

// Configure nodemailer with your email service
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER, 
    pass: process.env.GMAIL_PASS
  }
});

// Store verification codes temporarily 
const verificationCodes = {};

// Route for forgot password - send verification code
app.post('/api/forgot-password', (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }
  
  // Check if email exists in database
  const query = 'SELECT * FROM users WHERE email = ?';
  db.query(query, [email], (err, results) => {
    if (err) {
      console.error('Database error during email check:', err);
      return res.status(500).json({ success: false, message: 'Database error' });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ success: false, message: 'Email not found' });
    }
    
    // Generate a 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store the code with expiration time (30 minutes)
    verificationCodes[email] = {
      code: verificationCode,
      expiry: Date.now() + 30 * 60 * 1000 
    };
    
    const mailOptions = {
      from: 'your-email@gmail.com',
      to: email,
      subject: 'Password Reset Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>We received a request to reset your password. Please use the following verification code to proceed:</p>
          <div style="background-color: #f4f4f4; padding: 15px; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 5px;">
            ${verificationCode}
          </div>
          <p>This code will expire in 30 minutes.</p>
          <p>If you didn't request a password reset, please ignore this email.</p>
        </div>
      `
    };
    
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending email:', error);
        return res.status(500).json({ success: false, message: 'Failed to send verification code' });
      }
      
      res.json({ success: true, message: 'Verification code sent to your email' });
    });
  });
});

// Route for verifying code and resetting password
app.post('/api/verify-reset-code', (req, res) => {
  const { email, code } = req.body;
  
  if (!email || !code) {
    return res.status(400).json({ success: false, message: 'Email and verification code are required' });
  }
  
  // Check if verification code exists and is valid
  const storedData = verificationCodes[email];
  if (!storedData) {
    return res.status(400).json({ success: false, message: 'No verification code found for this email' });
  }
  
  if (storedData.expiry < Date.now()) {
    // Remove expired code
    delete verificationCodes[email];
    return res.status(400).json({ success: false, message: 'Verification code has expired' });
  }
  
  if (storedData.code !== code) {
    return res.status(400).json({ success: false, message: 'Invalid verification code' });
  }
  
  // if Code is valid, allowing for password reset
  res.json({ success: true, message: 'Verification successful' });
});

// Route for setting new password
app.post('/api/reset-password', (req, res) => {
  const { email, code, newPassword } = req.body;
  
  if (!email || !code || !newPassword) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
  }
  
  // Verify the code matches the stored verification code
  const storedData = verificationCodes[email];
  if (!storedData || storedData.code !== code) {
      return res.status(400).json({ success: false, message: 'Invalid verification code' });
  }
  
  // Hash the new password
  bcrypt.hash(newPassword, 10, (hashErr, hashedPassword) => {
      if (hashErr) {
          console.error('Error hashing password:', hashErr);
          return res.status(500).json({ success: false, message: 'Password hashing error' });
      }
      
      // Update password in database
      const query = 'UPDATE users SET password = ? WHERE email = ?';
      db.query(query, [hashedPassword, email], (err, result) => {
        if (err) {
          console.error('Database error during password update:', err);
          return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        if (result.affectedRows === 0) {
          return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        // Remove verification code after successful reset
        delete verificationCodes[email];
        
        res.json({ success: true, message: 'Password reset successful' });
      });
  });
});

// Route for getting admin profile
app.get('/api/admin-profile', (req, res) => {
    const email = req.query.email;
    
    if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
    }
    
    const query = 'SELECT id, name, email, role, bio,created_at,profile_image FROM users WHERE email = ? AND (role = "admin" OR role = "super-admin")';
    db.query(query, [email], (err, results) => {
        if (err) {
            console.error('Database error while fetching admin profile:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Admin not found' });
        }
        
        res.json({ success: true, admin: results[0] });
    });
});

// Route for updating admin profile
app.put('/api/admin-profile', (req, res) => {
    const { email, name, bio } = req.body;
    
    if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
    }
    
    const query = 'UPDATE users SET name = ?, bio = ? WHERE email = ? AND (role = "admin" OR role = "super-admin")';
    db.query(query, [name, bio, email], (err, result) => {
        if (err) {
            console.error('Database error while updating admin profile:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Admin not found' });
        }

        // Log profile update activity
        logActivity(email, 'admin', 'profile_update', 'Updated profile information', null, req);

        res.json({ success: true, message: 'Profile updated successfully' });
    });
});

// Route for updating admin password
app.put('/api/admin-password', (req, res) => {
    const { email, currentPassword, newPassword } = req.body;
    
    if (!email || !currentPassword || !newPassword) {
        return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    
    // First verify the current password
    const verifyQuery = 'SELECT password FROM users WHERE email = ? AND (role = "admin" OR role = "super-admin")';
    db.query(verifyQuery, [email], (err, results) => {
        if (err) {
            console.error('Database error while verifying password:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Admin not found' });
        }
        
        const hashedPassword = results[0].password;
        
        // Compare the current password with the stored hash
        bcrypt.compare(currentPassword, hashedPassword, (bcryptErr, isMatch) => {
            if (bcryptErr) {
                console.error('Error comparing passwords:', bcryptErr);
                return res.status(500).json({ success: false, message: 'Password verification error' });
            }
            
            if (!isMatch) {
                return res.status(401).json({ success: false, message: 'Current password is incorrect' });
            }
            
            // Hash the new password
            bcrypt.hash(newPassword, 10, (hashErr, hashedNewPassword) => {
                if (hashErr) {
                    console.error('Error hashing new password:', hashErr);
                    return res.status(500).json({ success: false, message: 'Password hashing error' });
                }
                
                // Update the password
                const updateQuery = 'UPDATE users SET password = ? WHERE email = ?';
                db.query(updateQuery, [hashedNewPassword, email], (updateErr, updateResult) => {
                    if (updateErr) {
                        console.error('Database error while updating password:', updateErr);
                        return res.status(500).json({ success: false, message: 'Database error' });
                    }
                    
                    // Log password change activity
                    logActivity(email, 'admin', 'password_change', 'Changed password', null, req);

                    res.json({ success: true, message: 'Password updated successfully' });
                });
            });
        });
    });
});

// Configure storage for profile images
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        const dir = path.join(__dirname, 'uploads/profile-images');
    
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function(req, file, cb) {
        const ext = path.extname(file.originalname);
        cb(null, 'profile-' + Date.now() + ext);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: function(req, file, cb) {
        // Accept only image files
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
            return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
    }
});

// Route for uploading profile image
app.post('/api/admin-profile-image', verifyToken, upload.single('profile_image'), (req, res) => {
    const email = req.body.email;
    
    if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
    }
    
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No image file uploaded' });
    }
    
    const imagePath = '/uploads/profile-images/' + path.basename(req.file.path);
    
    // Update the profile_image field in the database
    const query = 'UPDATE users SET profile_image = ? WHERE email = ?';
    db.query(query, [imagePath, email], (err, result) => {
        if (err) {
            console.error('Database error while updating profile image:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Admin not found' });
        }
        
        res.json({ 
            success: true, 
            message: 'Profile image updated successfully',
            image_path: imagePath
        });
    });
});

// Route for generating multiple device IDs
app.post('/api/generate-device-ids', (req, res) => {
    const { count, adminEmail } = req.body;
    
    if (!count || !adminEmail) {
        return res.status(400).json({ success: false, message: 'Missing count or adminEmail' });
    }

    const maxCount = 100;
    const actualCount = Math.min(count, maxCount);
    
    const generatedIds = [];
    function generateUniqueID() {
        const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let id = '';

        for (let group = 0; group < 4; group++) {
            for (let i = 0; i < 4; i++) {
                const randomIndex = Math.floor(Math.random() * chars.length);
                id += chars[randomIndex];
            }
            if (group < 3) id += '-';
        }
        
        return id;
    }
    
    // Function to check if an ID exists and insert if it doesn't
    function checkAndInsertID() {
        if (generatedIds.length >= actualCount) {
            return res.json({ success: true, ids: generatedIds });
        }
        
        const deviceId = generateUniqueID();
        
        // Check if device ID already exists
        const checkQuery = 'SELECT COUNT(*) AS count FROM device_ids WHERE device_id = ?';
        db.query(checkQuery, [deviceId], (err, results) => {
            if (err) {
                console.error('Database error during device ID check:', err);
                return res.status(500).json({ success: false, message: 'Database error' });
            }
            
            if (results[0].count > 0) {
                return checkAndInsertID();
            }
            
            // Generate QR code
            const qr = qrcode(0, 'M');
            qr.addData(deviceId);
            qr.make();
            const qrCodeData = qr.createImgTag(5);
            
            // Insert new device ID with admin email
            const insertQuery = 'INSERT INTO device_ids (device_id, qr_code_data, created_by) VALUES (?, ?, ?)';
            db.query(insertQuery, [deviceId, qrCodeData, adminEmail], (err, result) => {
                if (err) {
                    console.error('Database error during device ID insertion:', err);
                    return res.status(500).json({ success: false, message: 'Database error' });
                }
                
                // Log device creation activity
                logActivity(adminEmail, 'admin', 'device_create', `Created device ${deviceId}`, deviceId, req);

                generatedIds.push(deviceId);
                checkAndInsertID(); // Continue with the next ID
            });
        });
    }
    checkAndInsertID();
});

// User-specific API endpoints

// Route for getting user profile
app.get('/api/user-profile', verifyToken, (req, res) => {
    const email = req.query.email;

    if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const query = 'SELECT id, name, email, role, bio, created_at, profile_image FROM users WHERE email = ? AND role = "user"';
    db.query(query, [email], (err, results) => {
        if (err) {
            console.error('Database error while fetching user profile:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({ success: true, user: results[0] });
    });
});

// Route for updating user profile
app.put('/api/user-profile', verifyToken, (req, res) => {
    const { email, name, newEmail, bio } = req.body;

    if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
    }

    // Check if new email already exists (if email is being changed)
    if (newEmail && newEmail !== email) {
        const checkEmailQuery = 'SELECT id FROM users WHERE email = ?';
        db.query(checkEmailQuery, [newEmail], (err, results) => {
            if (err) {
                console.error('Database error while checking email:', err);
                return res.status(500).json({ success: false, message: 'Database error' });
            }

            if (results.length > 0) {
                return res.status(400).json({ success: false, message: 'Email already exists' });
            }

            // Update profile with new email
            updateProfile();
        });
    } else {
        // Update profile without changing email
        updateProfile();
    }

    function updateProfile() {
        const updateEmail = newEmail || email;
        const query = 'UPDATE users SET name = ?, email = ?, bio = ? WHERE email = ? AND role = "user"';
        db.query(query, [name, updateEmail, bio, email], (err, result) => {
            if (err) {
                console.error('Database error while updating user profile:', err);
                return res.status(500).json({ success: false, message: 'Database error' });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }

            // Log profile update activity
            const finalEmail = newEmail || email;
            logActivity(finalEmail, 'user', 'profile_update', 'Updated profile information', null, req);

            res.json({ success: true, message: 'Profile updated successfully' });
        });
    }
});

// Route for updating user password
app.put('/api/user-password', verifyToken, (req, res) => {
    const { email, currentPassword, newPassword } = req.body;

    if (!email || !currentPassword || !newPassword) {
        return res.status(400).json({ success: false, message: 'Email, current password, and new password are required' });
    }

    // First, verify the current password
    const query = 'SELECT password FROM users WHERE email = ? AND role = "user"';
    db.query(query, [email], (err, results) => {
        if (err) {
            console.error('Database error while fetching user for password update:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const user = results[0];

        // Compare current password
        bcrypt.compare(currentPassword, user.password, (err, isMatch) => {
            if (err) {
                console.error('Error comparing passwords:', err);
                return res.status(500).json({ success: false, message: 'Server error' });
            }

            if (!isMatch) {
                return res.status(400).json({ success: false, message: 'Current password is incorrect' });
            }

            // Hash new password
            bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
                if (err) {
                    console.error('Error hashing new password:', err);
                    return res.status(500).json({ success: false, message: 'Server error' });
                }

                // Update password
                const updateQuery = 'UPDATE users SET password = ? WHERE email = ? AND role = "user"';
                db.query(updateQuery, [hashedPassword, email], (err, result) => {
                    if (err) {
                        console.error('Database error while updating password:', err);
                        return res.status(500).json({ success: false, message: 'Database error' });
                    }

                    // Log password change activity
                    logActivity(email, 'user', 'password_change', 'Changed password', null, req);

                    res.json({ success: true, message: 'Password updated successfully' });
                });
            });
        });
    });
});

// Route for uploading user avatar
app.post('/api/user-avatar', verifyToken, upload.single('avatar'), (req, res) => {
    const email = req.body.email;

    if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
    }

    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No image file uploaded' });
    }

    const imagePath = '/uploads/profile-images/' + path.basename(req.file.path);

    // Update the profile_image field in the database
    const query = 'UPDATE users SET profile_image = ? WHERE email = ? AND role = "user"';
    db.query(query, [imagePath, email], (err, result) => {
        if (err) {
            console.error('Database error while updating user avatar:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({
            success: true,
            message: 'Avatar updated successfully',
            image_path: imagePath
        });
    });
});

// Route for getting user statistics
app.get('/api/user-stats', verifyToken, (req, res) => {
    const email = req.query.email;

    if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
    }

    // Get user's linked devices count
    const linkedDevicesQuery = 'SELECT COUNT(*) AS linkedDevices FROM device_ids WHERE assigned_to = ?';

    db.query(linkedDevicesQuery, [email], (err, linkedResults) => {
        if (err) {
            console.error('Database error while fetching user stats:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        const linkedDevices = linkedResults[0].linkedDevices;

        res.json({
            success: true,
            stats: {
                linkedDevices: linkedDevices
            }
        });
    });
});

// Route for getting user activity
app.get('/api/user-activity', verifyToken, (req, res) => {
    const email = req.query.email;

    if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
    }

    // For now, return empty activity. You can implement actual activity tracking later
    res.json({
        success: true,
        activities: []
    });
});

// Route for getting user's linked devices
app.get('/api/user-devices', verifyToken, (req, res) => {
    const email = req.query.email;

    if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const query = `
        SELECT device_id, assigned_at as linked_at, 'assigned' as status
        FROM device_ids
        WHERE assigned_to = ?
        ORDER BY assigned_at DESC
    `;

    db.query(query, [email], (err, results) => {
        if (err) {
            console.error('Database error while fetching user devices:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        res.json({ success: true, devices: results });
    });
});

// Route for linking a device to user
app.post('/api/link-device', verifyToken, (req, res) => {
    const { userEmail, deviceId } = req.body;

    if (!userEmail || !deviceId) {
        return res.status(400).json({ success: false, message: 'User email and device ID are required' });
    }

    // First check if device exists and is not already assigned
    const checkDeviceQuery = 'SELECT device_id, assigned_to FROM device_ids WHERE device_id = ?';
    db.query(checkDeviceQuery, [deviceId], (err, deviceResults) => {
        if (err) {
            console.error('Database error while checking device:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        if (deviceResults.length === 0) {
            return res.status(404).json({ success: false, message: 'Device ID not found' });
        }

        const device = deviceResults[0];
        if (device.assigned_to) {
            return res.status(400).json({ success: false, message: 'Device ID already taken' });
        }

        // Assign device to user
        const assignQuery = 'UPDATE device_ids SET assigned_to = ?, assigned_at = NOW() WHERE device_id = ?';
        db.query(assignQuery, [userEmail, deviceId], (err, result) => {
            if (err) {
                console.error('Database error while assigning device:', err);
                return res.status(500).json({ success: false, message: 'Database error' });
            }

            // Log device linking activity
            logActivity(userEmail, 'user', 'device_link', `Linked device ${deviceId}`, deviceId, req);

            res.json({ success: true, message: 'Device linked successfully' });
        });
    });
});

// Route for unlinking a device from user
app.delete('/api/unlink-device', verifyToken, (req, res) => {
    const { userEmail, deviceId } = req.body;

    if (!userEmail || !deviceId) {
        return res.status(400).json({ success: false, message: 'User email and device ID are required' });
    }

    // First delete all location data for this device
    const deleteLocationsQuery = 'DELETE FROM device_locations WHERE device_id = ?';
    db.query(deleteLocationsQuery, [deviceId], (err, locationResult) => {
        if (err) {
            console.error('Database error while deleting device locations:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        console.log(`Deleted ${locationResult.affectedRows} location records for device ${deviceId} during user unlink`);

        // Then unlink the device
        const query = 'UPDATE device_ids SET assigned_to = NULL, assigned_at = NULL WHERE assigned_to = ? AND device_id = ?';
        db.query(query, [userEmail, deviceId], (err, result) => {
            if (err) {
                console.error('Database error while unlinking device:', err);
                return res.status(500).json({ success: false, message: 'Database error' });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: 'Device link not found' });
            }

            // Log device unlinking activity
            logActivity(userEmail, 'user', 'device_unlink', `Unlinked device ${deviceId}`, deviceId, req);

            res.json({
                success: true,
                message: 'Device unlinked and location data deleted successfully',
                locationsDeleted: locationResult.affectedRows
            });
        });
    });
});

// Route for admin to unlink a device
app.post('/api/admin-unlink-device', verifyToken, (req, res) => {
    const { deviceId } = req.body;
    const adminEmail = req.user.email; // Get admin email from token

    if (!deviceId) {
        return res.status(400).json({ success: false, message: 'Device ID is required' });
    }

    // First delete all location data for this device
    const deleteLocationsQuery = 'DELETE FROM device_locations WHERE device_id = ?';
    db.query(deleteLocationsQuery, [deviceId], (err, locationResult) => {
        if (err) {
            console.error('Database error while deleting device locations:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        console.log(`Deleted ${locationResult.affectedRows} location records for device ${deviceId} during unlink`);

        // Then unlink the device
        const query = 'UPDATE device_ids SET assigned_to = NULL, assigned_at = NULL WHERE device_id = ?';
        db.query(query, [deviceId], (err, result) => {
            if (err) {
                console.error('Database error while unlinking device:', err);
                return res.status(500).json({ success: false, message: 'Database error' });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: 'Device not found or not linked' });
            }

            // Log device unlinking activity (works for both admin and super admin)
            const userRole = req.user.role; // Get actual role from token
            logActivity(adminEmail, userRole, 'device_unlink', `Unlinked device ${deviceId}`, deviceId, req);

            res.json({
                success: true,
                message: 'Device unlinked and location data deleted successfully',
                locationsDeleted: locationResult.affectedRows
            });
        });
    });
});

// Route for blocking a user
app.post('/api/block-user', verifyToken, (req, res) => {
    const { userId } = req.body;
    const adminEmail = req.user.email; // Get admin email from token

    if (!userId) {
        return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    // First get the user's email for activity logging
    const getUserQuery = 'SELECT email FROM users WHERE id = ?';
    db.query(getUserQuery, [userId], (err, userResults) => {
        if (err) {
            console.error('Database error while fetching user for blocking:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        if (userResults.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const userEmail = userResults[0].email;

        const query = 'UPDATE users SET status = "blocked" WHERE id = ?';
        db.query(query, [userId], (err, result) => {
            if (err) {
                console.error('Database error while blocking user:', err);
                return res.status(500).json({ success: false, message: 'Database error' });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }

            // Log activity for user blocking (works for both admin and super admin)
            const userRole = req.user.role; // Get actual role from token
            logActivity(adminEmail, userRole, 'user_block', `Blocked user ${userEmail}`, userEmail, req);

            res.json({ success: true, message: 'User blocked successfully' });
        });
    });
});

// Route for unblocking a user
app.post('/api/unblock-user', verifyToken, (req, res) => {
    const { userId } = req.body;
    const adminEmail = req.user.email; // Get admin email from token

    if (!userId) {
        return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    // First get the user's email for activity logging
    const getUserQuery = 'SELECT email FROM users WHERE id = ?';
    db.query(getUserQuery, [userId], (err, userResults) => {
        if (err) {
            console.error('Database error while fetching user for unblocking:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        if (userResults.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const userEmail = userResults[0].email;

        const query = 'UPDATE users SET status = "active" WHERE id = ?';
        db.query(query, [userId], (err, result) => {
            if (err) {
                console.error('Database error while unblocking user:', err);
                return res.status(500).json({ success: false, message: 'Database error' });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }

            // Log activity for user unblocking (works for both admin and super admin)
            const userRole = req.user.role; // Get actual role from token
            logActivity(adminEmail, userRole, 'user_unblock', `Unblocked user ${userEmail}`, userEmail, req);

            res.json({ success: true, message: 'User unblocked successfully' });
        });
    });
});

// Super Admin API endpoints
// Route for getting super admin dashboard statistics
app.get('/api/superadmin-stats', (req, res) => {
    // Get total users, admins, assigned devices, unassigned devices count
    const userCountQuery = "SELECT COUNT(*) AS userCount FROM users WHERE role='user'";
    const adminCountQuery = "SELECT COUNT(*) AS adminCount FROM users WHERE role='admin'";
    const assignedDeviceCountQuery = "SELECT COUNT(*) AS assignedDeviceCount FROM device_ids WHERE assigned_to IS NOT NULL";
    const unassignedDeviceCountQuery = "SELECT COUNT(*) AS unassignedDeviceCount FROM device_ids WHERE assigned_to IS NULL";

    db.query(userCountQuery, (err, userResults) => {
        if (err) {
            console.error('Database error while fetching user count:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        db.query(adminCountQuery, (err, adminResults) => {
            if (err) {
                console.error('Database error while fetching admin count:', err);
                return res.status(500).json({ success: false, message: 'Database error' });
            }

            db.query(assignedDeviceCountQuery, (err, assignedResults) => {
                if (err) {
                    console.error('Database error while fetching assigned device count:', err);
                    return res.status(500).json({ success: false, message: 'Database error' });
                }

                db.query(unassignedDeviceCountQuery, (err, unassignedResults) => {
                    if (err) {
                        console.error('Database error while fetching unassigned device count:', err);
                        return res.status(500).json({ success: false, message: 'Database error' });
                    }

                    res.json({
                        success: true,
                        stats: {
                            userCount: userResults[0].userCount,
                            adminCount: adminResults[0].adminCount,
                            assignedDeviceCount: assignedResults[0].assignedDeviceCount,
                            unassignedDeviceCount: unassignedResults[0].unassignedDeviceCount
                        }
                    });
                });
            });
        });
    });
});

// Route for getting all admins (for super admin)
app.get('/api/superadmin-admins', (req, res) => {
    const query = "SELECT id, name, email, role, status, created_at FROM users WHERE role='admin' ORDER BY created_at DESC";
    db.query(query, (err, results) => {
        if (err) {
            console.error('Database error while fetching admins:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        res.json({ success: true, admins: results });
    });
});

// Route for getting all users (for super admin)
app.get('/api/superadmin-users', (req, res) => {
    const query = "SELECT id, name, email, role, status, created_at FROM users WHERE role='user' ORDER BY created_at DESC";
    db.query(query, (err, results) => {
        if (err) {
            console.error('Database error while fetching users:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        res.json({ success: true, users: results });
    });
});

// Route for deleting an admin (super admin only)
app.delete('/api/admins/:id',verifyToken, (req, res) => {
    const adminId = req.params.id;

    // First, get the admin's email to unassign devices
    const getAdminQuery = 'SELECT email FROM users WHERE id = ? AND role = "admin"';
    db.query(getAdminQuery, [adminId], (err, adminResults) => {
        if (err) {
            console.error('Database error while fetching admin:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        if (adminResults.length === 0) {
            return res.status(404).json({ success: false, message: 'Admin not found' });
        }

        const adminEmail = adminResults[0].email;

        // Delete all activity history for this admin
        const deleteActivityQuery = 'DELETE FROM activity_logs WHERE user_email = ?';
        db.query(deleteActivityQuery, [adminEmail], (err, activityResult) => {
            if (err) {
                console.error('Database error while deleting admin activity history:', err);
                return res.status(500).json({ success: false, message: 'Database error while deleting activity history' });
            }

            console.log(`Deleted ${activityResult.affectedRows} activity log records for admin ${adminEmail}`);

            // Now delete the admin
            const deleteAdminQuery = 'DELETE FROM users WHERE id = ? AND role = "admin"';
            db.query(deleteAdminQuery, [adminId], (err, deleteResult) => {
                if (err) {
                    console.error('Database error while deleting admin:', err);
                    return res.status(500).json({ success: false, message: 'Database error' });
                }

                // Log admin deletion activity
                const superAdminEmail = req.user.email; // Get super admin email from token
                const userRole = req.user.role; // Get actual role from token
                logActivity(superAdminEmail, userRole, 'admin_delete', `Deleted admin ${adminEmail}`, adminEmail, req);

                const deletedActivityCount = activityResult.affectedRows;
                let message = 'Admin deleted successfully';
                if (deletedActivityCount > 0) {
                    message += ` and ${deletedActivityCount} activity record${deletedActivityCount > 1 ? 's' : ''} removed`;
                }

                res.json({ success: true, message: message });
            });
        });
    });
});

// Route for blocking an admin
app.post('/api/block-admin', verifyToken, (req, res) => {
    const { adminId } = req.body;
    const superAdminEmail = req.user.email; // Get super admin email from token

    if (!adminId) {
        return res.status(400).json({ success: false, message: 'Admin ID is required' });
    }

    // First get admin email for logging
    const getAdminQuery = 'SELECT email FROM users WHERE id = ? AND role = "admin"';
    db.query(getAdminQuery, [adminId], (err, adminResults) => {
        if (err) {
            console.error('Database error while getting admin info:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        if (adminResults.length === 0) {
            return res.status(404).json({ success: false, message: 'Admin not found' });
        }

        const adminEmail = adminResults[0].email;

        const query = 'UPDATE users SET status = "blocked" WHERE id = ? AND role = "admin"';
        db.query(query, [adminId], (err, result) => {
            if (err) {
                console.error('Database error while blocking admin:', err);
                return res.status(500).json({ success: false, message: 'Database error' });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: 'Admin not found' });
            }

            // Log admin blocking activity
            const userRole = req.user.role; // Get actual role from token
            logActivity(superAdminEmail, userRole, 'admin_block', `Blocked admin ${adminEmail}`, adminEmail, req);

            res.json({ success: true, message: 'Admin blocked successfully' });
        });
    });
});

// Route for unblocking an admin
app.post('/api/unblock-admin', verifyToken, (req, res) => {
    const { adminId } = req.body;
    const superAdminEmail = req.user.email; // Get super admin email from token

    if (!adminId) {
        return res.status(400).json({ success: false, message: 'Admin ID is required' });
    }

    // First get admin email for logging
    const getAdminQuery = 'SELECT email FROM users WHERE id = ? AND role = "admin"';
    db.query(getAdminQuery, [adminId], (err, adminResults) => {
        if (err) {
            console.error('Database error while getting admin info:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        if (adminResults.length === 0) {
            return res.status(404).json({ success: false, message: 'Admin not found' });
        }

        const adminEmail = adminResults[0].email;

        const query = 'UPDATE users SET status = "active" WHERE id = ? AND role = "admin"';
        db.query(query, [adminId], (err, result) => {
            if (err) {
                console.error('Database error while unblocking admin:', err);
                return res.status(500).json({ success: false, message: 'Database error' });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: 'Admin not found' });
            }

            // Log admin unblocking activity
            const userRole = req.user.role; // Get actual role from token
            logActivity(superAdminEmail, userRole, 'admin_unblock', `Unblocked admin ${adminEmail}`, adminEmail, req);

            res.json({ success: true, message: 'Admin unblocked successfully' });
        });
    });
});

// Route for super admin to delete any device (no restrictions)
app.delete('/api/superadmin-delete-device/:id',verifyToken, (req, res) => {
    const deviceId = req.params.id;

    // First delete all location data for this device
    const deleteLocationsQuery = 'DELETE FROM device_locations WHERE device_id = ?';
    db.query(deleteLocationsQuery, [deviceId], (err, locationResult) => {
        if (err) {
            console.error('Database error while deleting device locations:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        console.log(`Deleted ${locationResult.affectedRows} location records for device ${deviceId}`);

        // Then delete the device ID
        const deleteQuery = 'DELETE FROM device_ids WHERE device_id = ?';
        db.query(deleteQuery, [deviceId], (err, result) => {
            if (err) {
                console.error('Database error while deleting device ID:', err);
                return res.status(500).json({ success: false, message: 'Database error' });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: 'Device not found' });
            }
            logActivity(req.user.email, req.user.role, 'device_delete', `Deleted device ${deviceId}`, deviceId, req);
            res.json({
                success: true,
                message: 'Device and all associated location data deleted successfully',
                locationsDeleted: locationResult.affectedRows
            });
        });
    });
});

// Route for getting super admin profile
app.get('/api/superadmin-profile', (req, res) => {
    const query = "SELECT name, email, bio, role, created_at, profile_image FROM users WHERE role='super-admin' LIMIT 1";
    db.query(query, (err, results) => {
        if (err) {
            console.error('Database error while fetching super admin profile:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Super admin profile not found' });
        }

        res.json({ success: true, profile: results[0] });
    });
});

// Route for updating super admin profile
app.post('/api/update-superadmin-profile', (req, res) => {
    const { name, bio } = req.body;

    if (!name) {
        return res.status(400).json({ success: false, message: 'Name is required' });
    }

    // First get the super admin email for activity logging
    const getEmailQuery = "SELECT email FROM users WHERE role = 'super-admin' LIMIT 1";
    db.query(getEmailQuery, (err, emailResults) => {
        if (err) {
            console.error('Database error while getting super admin email:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        if (emailResults.length === 0) {
            return res.status(404).json({ success: false, message: 'Super admin not found' });
        }

        const superAdminEmail = emailResults[0].email;

        const query = "UPDATE users SET name = ?, bio = ? WHERE role = 'super-admin'";
        db.query(query, [name, bio], (err, result) => {
            if (err) {
                console.error('Database error while updating super admin profile:', err);
                return res.status(500).json({ success: false, message: 'Database error' });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: 'Super admin not found' });
            }

            // Log profile update activity
            logActivity(superAdminEmail, 'super-admin', 'profile_update', 'Updated profile information', null, req);

            res.json({ success: true, message: 'Profile updated successfully' });
        });
    });
});

// Route for updating super admin avatar
app.post('/api/update-superadmin-avatar', (req, res) => {
    const { avatar } = req.body;

    if (!avatar) {
        return res.status(400).json({ success: false, message: 'Avatar data is required' });
    }

    const query = "UPDATE users SET profile_image = ? WHERE role = 'super-admin'";
    db.query(query, [avatar], (err, result) => {
        if (err) {
            console.error('Database error while updating super admin avatar:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Super admin not found' });
        }

        res.json({ success: true, message: 'Avatar updated successfully' });
    });
});

// Route for changing super admin password
app.post('/api/change-superadmin-password', (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ success: false, message: 'Current password and new password are required' });
    }

    // First, get the current password from database
    const getPasswordQuery = "SELECT * FROM users WHERE role = 'super-admin' LIMIT 1";
    db.query(getPasswordQuery, (err, results) => {
        if (err) {
            console.error('Database error while fetching super admin password:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Super admin not found' });
        }

        const storedPassword = results[0].password;

        // Check if current password matches (compare with hashed password if using bcrypt)
        bcrypt.compare(currentPassword, storedPassword, (err, isMatch) => {
            if (err) {
                console.error('Error comparing passwords:', err);
                return res.status(500).json({ success: false, message: 'Password verification error' });
            }

            if (!isMatch) {
                return res.status(400).json({ success: false, message: 'Current password is incorrect' });
            }

            // Hash the new password
            bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
                if (err) {
                    console.error('Error hashing new password:', err);
                    return res.status(500).json({ success: false, message: 'Password hashing error' });
                }

                // Update password in database
                const updatePasswordQuery = "UPDATE users SET password = ? WHERE role = 'super-admin'";
                db.query(updatePasswordQuery, [hashedPassword], (err, result) => {
                    if (err) {
                        console.error('Database error while updating super admin password:', err);
                        return res.status(500).json({ success: false, message: 'Database error' });
                    }

                    if (result.affectedRows === 0) {
                        return res.status(404).json({ success: false, message: 'Super admin not found' });
                    }
                    logActivity(results[0].email, 'super-admin', 'password_change', 'You changed your password', null, req);
                    res.json({ success: true, message: 'Password changed successfully' });
                });
            });
        });
    });
});


// API to save device location 
app.post('/api/track-location', (req, res) => {
    const { device_id, latitude, longitude } = req.body;

    if (!device_id || !latitude || !longitude) {
        return res.status(400).json({
            success: false,
            message: 'Device ID, latitude, and longitude are required'
        });
    }

    // Check if device exists and is assigned
    const checkDeviceQuery = `
        SELECT d.*, u.email as user_email
        FROM device_ids d
        LEFT JOIN users u ON d.assigned_to = u.email
        WHERE d.device_id = ?
    `;

    db.query(checkDeviceQuery, [device_id], (err, results) => {
        if (err) {
            console.error('Database error while checking device:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Device not found'
            });
        }

        const device = results[0];
        if (!device.assigned_to) {
            return res.status(400).json({
                success: false,
                message: 'Device is not assigned to any user'
            });
        }

        // Insert location data
        const insertLocationQuery = `
            INSERT INTO device_locations (device_id, user_email, latitude, longitude)
            VALUES (?, ?, ?, ?)
        `;

        db.query(insertLocationQuery, [device_id, device.user_email, latitude, longitude], (err, result) => {
            if (err) {
                console.error('Database error while saving location:', err);
                return res.status(500).json({ success: false, message: 'Database error' });
            }

            res.json({
                success: true,
                message: 'Location saved successfully',
                location_id: result.insertId
            });
        });
    });
});

// API to get device locations for tracking
app.get('/api/device-locations/:device_id', (req, res) => {
    const { device_id } = req.params;
    const userEmail = req.query.user_email;

    if (!userEmail) {
        return res.status(400).json({
            success: false,
            message: 'User email is required'
        });
    }

    // Check if user has access to this device
    const checkAccessQuery = `
        SELECT * FROM device_ids
        WHERE device_id = ? AND assigned_to = ?
    `;

    db.query(checkAccessQuery, [device_id, userEmail], (err, accessResults) => {
        if (err) {
            console.error('Database error while checking access:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        if (accessResults.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Device not assigned to this user.'
            });
        }

        // Get locations for this device with optional date filtering
        let getLocationsQuery = `
            SELECT * FROM device_locations
            WHERE device_id = ? AND user_email = ?
        `;
        let queryParams = [device_id, userEmail];

        // Add date filtering if provided
        const startDate = req.query.start_date;
        const endDate = req.query.end_date;

        if (startDate && endDate) {
            console.log('Date filtering requested:', { startDate, endDate, device_id });

            // Since database stores timestamps in IST format directly, no conversion needed
            if (startDate.includes('T') && startDate.includes('Z')) {
                // ISO format - convert to IST format for database comparison
                const startIST = new Date(startDate).toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata' }).replace('T', ' ');
                const endIST = new Date(endDate).toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata' }).replace('T', ' ');
                console.log('Converting ISO to IST:', { startDate, endDate, startIST, endIST });
                getLocationsQuery += ` AND timestamp BETWEEN ? AND ?`;
                queryParams.push(startIST, endIST);
            } else {
                // IST format - use directly since database stores in IST
                console.log('Using IST dates directly:', { startDate, endDate });
                getLocationsQuery += ` AND timestamp BETWEEN ? AND ?`;
                queryParams.push(startDate, endDate);
            }
        }

        getLocationsQuery += ` ORDER BY timestamp ASC`;

        // Debug: Check what timestamps exist for this device
        if (startDate && endDate) {
            const debugQuery = `SELECT timestamp FROM device_locations WHERE device_id = ? AND user_email = ? ORDER BY timestamp DESC LIMIT 5`;
            db.query(debugQuery, [device_id, userEmail], (debugErr, debugResults) => {
                if (!debugErr && debugResults.length > 0) {
                    console.log('Recent timestamps in database for device:', device_id);
                    debugResults.forEach(row => {
                        console.log('  -', row.timestamp);
                    });
                } else {
                    console.log('No timestamps found for device:', device_id);
                }
            });
        }

        db.query(getLocationsQuery, queryParams, (err, locations) => {
            if (err) {
                console.error('Database error while fetching locations:', err);
                return res.status(500).json({ success: false, message: 'Database error' });
            }

            console.log(`Found ${locations.length} locations for device ${device_id}`);
            if (startDate && endDate) {
                console.log('Filter applied, locations found:', locations.length);
                if (locations.length > 0) {
                    console.log('Sample location timestamps:', locations.slice(0, 3).map(l => l.timestamp));
                }
            }

            res.json({
                success: true,
                device_id: device_id,
                locations: locations,
                filtered: !!(startDate && endDate),
                filter_period: startDate && endDate ? { start: startDate, end: endDate } : null
            });
        });
    });
});

// API to get all trackable devices for a user
app.get('/api/user-trackable-devices', (req, res) => {
    const userEmail = req.query.user_email;

    if (!userEmail) {
        return res.status(400).json({
            success: false,
            message: 'User email is required'
        });
    }

    const query = `
        SELECT d.device_id, d.created_at, d.assigned_at,
               COUNT(dl.id) as location_count,
               MAX(dl.timestamp) as last_tracked
        FROM device_ids d
        LEFT JOIN device_locations dl ON d.device_id = dl.device_id
        WHERE d.assigned_to = ?
        GROUP BY d.device_id, d.created_at, d.assigned_at
        ORDER BY d.assigned_at DESC
    `;

    db.query(query, [userEmail], (err, results) => {
        if (err) {
            console.error('Database error while fetching trackable devices:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        res.json({
            success: true,
            devices: results
        });
    });
});

// Debug API to check what location data exists
app.get('/api/debug-locations/:device_id', (req, res) => {
    const { device_id } = req.params;

    const query = `
        SELECT device_id, user_email, latitude, longitude, timestamp,
               DATE(timestamp) as date_only,
               TIME(timestamp) as time_only
        FROM device_locations
        WHERE device_id = ?
        ORDER BY timestamp DESC
        LIMIT 10
    `;

    db.query(query, [device_id], (err, results) => {
        if (err) {
            console.error('Debug query error:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        res.json({
            success: true,
            device_id: device_id,
            total_locations: results.length,
            recent_locations: results
        });
    });
});

// API to get activity logs
app.get('/api/activity-logs', verifyToken, (req, res) => {
    const userEmail = req.user.email;
    const userRole = req.user.role;
    const limit = parseInt(req.query.limit) || 50; // Increased default limit
    const startDate = req.query.start_date;
    const endDate = req.query.end_date;

    let query;
    let queryParams;

    // Define activity types to show in history - ALL activity types
    const historyActivityTypes = [
        'login', 'logout', 'device_create', 'device_delete', 'device_link', 'device_unlink',
        'user_create', 'user_delete', 'user_block', 'user_unblock', 'profile_update', 'password_change'
    ];
    const activityTypesFilter = historyActivityTypes.map(() => '?').join(',');

    // Build date filter
    let dateFilter = '';
    let dateParams = [];
    if (startDate && endDate) {
        console.log('Activity filter requested:', { startDate, endDate, userEmail, userRole });

        // Handle IST format dates
        if (startDate.includes('T') && startDate.includes('Z')) {
            // ISO format - use as is
            dateFilter = ' AND al.timestamp BETWEEN ? AND ?';
            dateParams = [startDate, endDate];
        } else {
            // IST format - use directly since database stores in IST
            dateFilter = ' AND al.timestamp BETWEEN ? AND ?';
            dateParams = [startDate, endDate];
        }

        console.log('Date filter applied:', { dateFilter, dateParams });
    }

    if (userRole === 'superadmin') {
        // Super admin can see all activities
        query = `
            SELECT al.*, u.name as user_name
            FROM activity_logs al
            LEFT JOIN users u ON al.user_email = u.email
            WHERE al.action_type IN (${activityTypesFilter})${dateFilter}
            ORDER BY al.timestamp DESC
            LIMIT ?
        `;
        queryParams = [...historyActivityTypes, ...dateParams, limit];
    } else if (userRole === 'admin') {
        // Admin can see only their own activities
        query = `
            SELECT al.*, u.name as user_name
            FROM activity_logs al
            LEFT JOIN users u ON al.user_email = u.email
            WHERE al.user_email = ?
            AND al.action_type IN (${activityTypesFilter})${dateFilter}
            ORDER BY al.timestamp DESC
            LIMIT ?
        `;
        queryParams = [userEmail, ...historyActivityTypes, ...dateParams, limit];
    } else {
        // Users can only see their own activities
        query = `
            SELECT al.*, u.name as user_name
            FROM activity_logs al
            LEFT JOIN users u ON al.user_email = u.email
            WHERE al.user_email = ?
            AND al.action_type IN (${activityTypesFilter})${dateFilter}
            ORDER BY al.timestamp DESC
            LIMIT ?
        `;
        queryParams = [userEmail, ...historyActivityTypes, ...dateParams, limit];
    }

    db.query(query, queryParams, (err, results) => {
        if (err) {
            console.error('Error fetching activity logs:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        } 
        if (startDate && endDate) {
            if (results.length > 0) {
                console.log('Sample activity timestamps:', results.slice(0, 3).map(r => r.timestamp));
            }
        }

        res.json({
            success: true,
            activities: results
        });
    });
});

// API to get super admin activity history
app.get('/api/superadmin-activity-history', verifyToken, (req, res) => {
    const userEmail = req.user.email;
    const userRole = req.user.role;
    // Only super admin can access this endpoint
    if (userRole !== 'super-admin') {
        return res.status(403).json({ success: false, message: 'Access denied. Super admin only.' });
    }

    const limit = parseInt(req.query.limit) || 50;
    const startDate = req.query.start_date;
    const endDate = req.query.end_date;

    // Define activity types to show in super admin history - super admin's own actions + administrative actions
    const historyActivityTypes = [
        'login', 'logout', 'profile_update', 'password_change',
        'device_delete', 'device_unlink', 'user_delete', 'user_block', 'user_unblock',
        'admin_delete', 'admin_block', 'admin_unblock'
    ];
    const activityTypesFilter = historyActivityTypes.map(() => '?').join(',');

    // Build date filter
    let dateFilter = '';
    let dateParams = [];
    if (startDate && endDate) {
        dateFilter = ' AND al.timestamp BETWEEN ? AND ?';
        dateParams = [startDate, endDate];
    }

    // Super admin can see only their own activities (like admin dashboard)
    const query = `
        SELECT al.*, u.name as user_name
        FROM activity_logs al
        LEFT JOIN users u ON al.user_email = u.email
        WHERE al.user_email = ?
        AND al.action_type IN (${activityTypesFilter})${dateFilter}
        ORDER BY al.timestamp DESC
        LIMIT ?
    `;
    const queryParams = [userEmail, ...historyActivityTypes, ...dateParams, limit];

    db.query(query, queryParams, (err, results) => {
        if (err) {
            console.error('Error fetching super admin activity logs:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        res.json({
            success: true,
            activities: results
        });
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
