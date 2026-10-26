-- ============================================================
-- Smart Hostel and Residential Management Platform
-- Sample MySQL Seed Data Script
-- ============================================================

USE hostel_db;

-- 1. Insert Initial Users (Passwords: Admin@123, Staff@123, Student@123 hashed via Werkzeug pbkdf2:sha256)
INSERT INTO users (id, username, email, password_hash, role, is_active) VALUES
(1, 'admin', 'admin@sruhostel.edu', 'scrypt:32768:8:1$j4tP7fUq1C8jZ6w$5c829e1f574d715df6e355c2f32145b2b2b1b315264b3ef816790938f0d85a1a1f0a3070621415eeadff5f18bf5d70f9116e9b4d1b84f3ebdae1858a8a4f6652', 'admin', 1),
(2, 'staff_rajesh', 'rajesh.staff@sruhostel.edu', 'scrypt:32768:8:1$j4tP7fUq1C8jZ6w$5c829e1f574d715df6e355c2f32145b2b2b1b315264b3ef816790938f0d85a1a1f0a3070621415eeadff5f18bf5d70f9116e9b4d1b84f3ebdae1858a8a4f6652', 'staff', 1),
(3, 'staff_priya', 'priya.staff@sruhostel.edu', 'scrypt:32768:8:1$j4tP7fUq1C8jZ6w$5c829e1f574d715df6e355c2f32145b2b2b1b315264b3ef816790938f0d85a1a1f0a3070621415eeadff5f18bf5d70f9116e9b4d1b84f3ebdae1858a8a4f6652', 'staff', 1),
(4, 'rahul_sharma', 'rahul.cse@sru.edu.in', 'scrypt:32768:8:1$j4tP7fUq1C8jZ6w$5c829e1f574d715df6e355c2f32145b2b2b1b315264b3ef816790938f0d85a1a1f0a3070621415eeadff5f18bf5d70f9116e9b4d1b84f3ebdae1858a8a4f6652', 'resident', 1),
(5, 'sneha_reddy', 'sneha.cse@sru.edu.in', 'scrypt:32768:8:1$j4tP7fUq1C8jZ6w$5c829e1f574d715df6e355c2f32145b2b2b1b315264b3ef816790938f0d85a1a1f0a3070621415eeadff5f18bf5d70f9116e9b4d1b84f3ebdae1858a8a4f6652', 'resident', 1);

-- 2. Hostels
INSERT INTO hostels (id, name, code, type, total_floors, warden_name, warden_contact, address) VALUES
(1, 'Aryabhata Boys Hostel (Block A)', 'BH-A', 'boys', 3, 'Dr. K. Srinivas', '9848011223', 'North Wing, SR University Campus'),
(2, 'Bhaskara Boys Hostel (Block B)', 'BH-B', 'boys', 3, 'Prof. V. Ramana', '9848011224', 'East Wing, SR University Campus'),
(3, 'Kalpana Chawla Girls Hostel (Block C)', 'GH-C', 'girls', 4, 'Dr. M. Lakshmi', '9848011225', 'South Wing, SR University Campus');

-- 3. Rooms
INSERT INTO rooms (id, hostel_id, room_number, floor, room_type, capacity, base_fee, status) VALUES
(1, 1, 'A-101', 1, 'double', 2, 35000.00, 'available'),
(2, 1, 'A-102', 1, 'double', 2, 35000.00, 'available'),
(3, 1, 'A-201', 2, 'single', 1, 50000.00, 'available'),
(4, 2, 'B-101', 1, 'double', 2, 32000.00, 'available'),
(5, 3, 'C-101', 1, 'double', 2, 36000.00, 'available'),
(6, 3, 'C-201', 2, 'double', 2, 36000.00, 'available');

-- 4. Residents
INSERT INTO residents (id, user_id, full_name, enrollment_no, phone, emergency_contact, parent_name, parent_phone, address, blood_group, course, branch, year_of_study, gender, status) VALUES
(1, 4, 'Rahul Sharma', 'SRU2023CSE045', '9876501234', '9876501230', 'Ramesh Sharma', '9876501239', 'Plot 42, Jubilee Hills, Hyderabad', 'O+', 'B.Tech CSE', 'Computer Science & Engineering', 3, 'male', 'active'),
(2, 5, 'Sneha Reddy', 'SRU2024CSE112', '9876502234', '9876502230', 'Srinivas Reddy', '9876502239', 'Road No 12, Banjara Hills, Hyderabad', 'B+', 'B.Tech CSE', 'Artificial Intelligence & Machine Learning', 2, 'female', 'active');

-- 5. Allocations
INSERT INTO room_allocations (id, resident_id, room_id, bed_number, start_date, status, remarks) VALUES
(1, 1, 1, 'Bed-1', '2026-07-01', 'active', 'Allocated for Odd Semester 2026'),
(2, 2, 6, 'Bed-1', '2026-07-01', 'active', 'Allocated for Odd Semester 2026');

-- 6. Fees & Payments
INSERT INTO fees (id, resident_id, fee_type, amount, due_date, status, academic_term) VALUES
(1, 1, 'semester_fee', 35000.00, '2026-08-15', 'paid', '2026-Odd'),
(2, 1, 'mess_fee', 18000.00, '2026-10-20', 'pending', '2026-Odd'),
(3, 2, 'semester_fee', 36000.00, '2026-08-15', 'paid', '2026-Odd');

INSERT INTO payments (id, fee_id, resident_id, amount_paid, payment_method, transaction_ref, payment_status, receipt_number, payment_date, notes) VALUES
(1, 1, 1, 35000.00, 'upi', 'TXN-UPI88329104', 'success', 'RCP-202608-00129', '2026-08-12 11:30:00', 'Paid online via UPI'),
(2, 3, 2, 36000.00, 'online', 'TXN-NET88329402', 'success', 'RCP-202608-00130', '2026-08-14 15:20:00', 'Netbanking payment');

-- 7. Facilities
INSERT INTO facilities (id, name, facility_code, description, capacity, location, is_active) VALUES
(1, 'Central Digital Study Center', 'FAC-STUDY-01', 'Quiet air-conditioned study room with high-speed internet', 30, 'Block A Ground Floor', 1),
(2, 'Indoor Badminton Court', 'FAC-SPORTS-01', 'Wooden court with evening flood lights', 12, 'Hostel Sports Complex', 1),
(3, 'Seminar & Common Discussion Hall', 'FAC-HALL-01', 'Projector-equipped presentation room', 40, 'Central Block 1st Floor', 1);

-- 8. Utility Records
INSERT INTO utility_records (id, hostel_id, billing_month, electricity_kwh, electricity_cost, water_liters, water_cost, logged_by, notes) VALUES
(1, 1, '2026-06', 4500.00, 36000.00, 68000.00, 6800.00, 'admin', 'Semester exams month'),
(2, 1, '2026-07', 3900.00, 31200.00, 59000.00, 5900.00, 'admin', 'Summer vacation partial occupancy'),
(3, 1, '2026-08', 4950.00, 39600.00, 76000.00, 7600.00, 'admin', 'Semester resumption surge');
