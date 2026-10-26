-- ============================================================
-- Smart Hostel and Residential Management Platform
-- MySQL Database Schema (DDL)
-- ============================================================

CREATE DATABASE IF NOT EXISTS hostel_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE hostel_db;

-- 1. Users Table (Authentication & RBAC)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(80) NOT NULL UNIQUE,
    email VARCHAR(120) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'resident', 'staff') NOT NULL DEFAULT 'resident',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_role (role),
    INDEX idx_user_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Hostels Table
CREATE TABLE IF NOT EXISTS hostels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    code VARCHAR(20) NOT NULL UNIQUE,
    type ENUM('boys', 'girls', 'co-ed') NOT NULL DEFAULT 'boys',
    total_floors INT NOT NULL DEFAULT 1,
    warden_name VARCHAR(100),
    warden_contact VARCHAR(20),
    address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Rooms Table
CREATE TABLE IF NOT EXISTS rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hostel_id INT NOT NULL,
    room_number VARCHAR(20) NOT NULL,
    floor INT NOT NULL DEFAULT 1,
    room_type ENUM('single', 'double', 'triple', 'quad') NOT NULL DEFAULT 'double',
    capacity INT NOT NULL DEFAULT 2,
    base_fee DECIMAL(10, 2) NOT NULL DEFAULT 25000.00,
    status ENUM('available', 'occupied', 'maintenance') NOT NULL DEFAULT 'available',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hostel_id) REFERENCES hostels(id) ON DELETE CASCADE,
    UNIQUE KEY uq_hostel_room (hostel_id, room_number),
    INDEX idx_room_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Residents Profile Table
CREATE TABLE IF NOT EXISTS residents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    full_name VARCHAR(120) NOT NULL,
    enrollment_no VARCHAR(50) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    emergency_contact VARCHAR(20) NOT NULL,
    parent_name VARCHAR(100),
    parent_phone VARCHAR(20),
    address TEXT,
    blood_group VARCHAR(10),
    course VARCHAR(100) DEFAULT 'B.Tech CSE',
    branch VARCHAR(100) DEFAULT 'Computer Science & Engineering',
    year_of_study INT DEFAULT 1,
    date_of_birth DATE,
    gender ENUM('male', 'female', 'other') DEFAULT 'male',
    status ENUM('active', 'inactive', 'alumni') NOT NULL DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_resident_status (status),
    INDEX idx_resident_enrollment (enrollment_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Room Allocations Table
CREATE TABLE IF NOT EXISTS room_allocations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    resident_id INT NOT NULL,
    room_id INT NOT NULL,
    bed_number VARCHAR(10) DEFAULT 'A',
    start_date DATE NOT NULL,
    end_date DATE,
    status ENUM('active', 'transferred', 'vacated') NOT NULL DEFAULT 'active',
    remarks TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    INDEX idx_allocation_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Fees Table
CREATE TABLE IF NOT EXISTS fees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    resident_id INT NOT NULL,
    fee_type ENUM('semester_fee', 'mess_fee', 'maintenance_fee', 'security_deposit') NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    due_date DATE NOT NULL,
    status ENUM('paid', 'pending', 'overdue', 'partially_paid') NOT NULL DEFAULT 'pending',
    academic_term VARCHAR(50) NOT NULL DEFAULT '2026-Odd',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE CASCADE,
    INDEX idx_fee_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Payments Table
CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fee_id INT NOT NULL,
    resident_id INT NOT NULL,
    amount_paid DECIMAL(10, 2) NOT NULL,
    payment_method ENUM('online', 'upi', 'card', 'bank_transfer', 'cash') NOT NULL DEFAULT 'upi',
    transaction_ref VARCHAR(100) NOT NULL UNIQUE,
    payment_status ENUM('success', 'failed', 'pending') NOT NULL DEFAULT 'success',
    receipt_number VARCHAR(50) NOT NULL UNIQUE,
    payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (fee_id) REFERENCES fees(id) ON DELETE CASCADE,
    FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE CASCADE,
    INDEX idx_payment_receipt (receipt_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Attendance Table (Constraint to prevent duplicate entries per resident per date)
CREATE TABLE IF NOT EXISTS attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    resident_id INT NOT NULL,
    date DATE NOT NULL,
    status ENUM('present', 'absent', 'leave', 'late') NOT NULL DEFAULT 'present',
    marked_by VARCHAR(50) DEFAULT 'system',
    qr_verified BOOLEAN NOT NULL DEFAULT FALSE,
    check_in_time TIME,
    remarks VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE CASCADE,
    UNIQUE KEY uq_resident_date (resident_id, date),
    INDEX idx_attendance_date (date),
    INDEX idx_attendance_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. Visitors Table
CREATE TABLE IF NOT EXISTS visitors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    resident_id INT NOT NULL,
    visitor_name VARCHAR(120) NOT NULL,
    visitor_phone VARCHAR(20) NOT NULL,
    visitor_id_proof VARCHAR(50),
    relationship VARCHAR(50) NOT NULL,
    purpose TEXT NOT NULL,
    visit_date DATE NOT NULL,
    expected_time VARCHAR(20) NOT NULL,
    actual_check_in DATETIME,
    actual_check_out DATETIME,
    pass_code VARCHAR(50) NOT NULL UNIQUE,
    qr_code_path VARCHAR(255),
    status ENUM('pending', 'approved', 'rejected', 'checked_in', 'checked_out') NOT NULL DEFAULT 'pending',
    approved_by INT,
    remarks TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_visitor_status (status),
    INDEX idx_visitor_pass (pass_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. Maintenance Requests Table
CREATE TABLE IF NOT EXISTS maintenance_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    resident_id INT NOT NULL,
    room_id INT,
    category ENUM('plumbing', 'electrical', 'wifi', 'cleaning', 'carpentry', 'furniture', 'other') NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    priority ENUM('low', 'medium', 'high', 'emergency') NOT NULL DEFAULT 'medium',
    status ENUM('pending', 'in_progress', 'resolved', 'cancelled') NOT NULL DEFAULT 'pending',
    assigned_to INT,
    work_notes TEXT,
    resolution_date DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_maint_status (status),
    INDEX idx_maint_priority (priority)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11. Facilities Table
CREATE TABLE IF NOT EXISTS facilities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    facility_code VARCHAR(30) NOT NULL UNIQUE,
    description TEXT,
    capacity INT NOT NULL DEFAULT 20,
    location VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 12. Facility Reservations Table
CREATE TABLE IF NOT EXISTS facility_reservations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    facility_id INT NOT NULL,
    resident_id INT NOT NULL,
    reservation_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    purpose TEXT NOT NULL,
    status ENUM('pending', 'approved', 'rejected', 'cancelled') NOT NULL DEFAULT 'pending',
    approved_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE CASCADE,
    FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_res_date_status (facility_id, reservation_date, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 13. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('fee', 'allocation', 'visitor', 'maintenance', 'facility', 'general') NOT NULL DEFAULT 'general',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    link_url VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_notif_user_read (user_id, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 14. Announcements Table
CREATE TABLE IF NOT EXISTS announcements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    content TEXT NOT NULL,
    target_audience ENUM('all', 'residents', 'staff') NOT NULL DEFAULT 'all',
    priority ENUM('normal', 'urgent') NOT NULL DEFAULT 'normal',
    created_by INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 15. Utility Records Table
CREATE TABLE IF NOT EXISTS utility_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hostel_id INT NOT NULL,
    billing_month VARCHAR(20) NOT NULL, -- e.g. '2026-08'
    electricity_kwh DECIMAL(10, 2) NOT NULL,
    electricity_cost DECIMAL(10, 2) NOT NULL,
    water_liters DECIMAL(10, 2) NOT NULL,
    water_cost DECIMAL(10, 2) NOT NULL,
    logged_by VARCHAR(50),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hostel_id) REFERENCES hostels(id) ON DELETE CASCADE,
    UNIQUE KEY uq_hostel_month (hostel_id, billing_month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 16. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT,
    details TEXT,
    ip_address VARCHAR(50),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_audit_action (action),
    INDEX idx_audit_entity (entity_type, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
