USE pharmalink;

-- Demo password for every seeded pharmacy below is: demo1234
INSERT INTO pharmacies (name, password_hash, area, distance, eta, latitude, longitude, verified) VALUES
('AfyaCare Pharmacy', '$2b$10$QvQy2GHgVNp03FybB3O.t.MjZQK2pVSW2l2f7KDA7D4MKvwK5PZIO', 'Nairobi CBD', '0.7 km', '7 min', -1.286400, 36.817200, TRUE),
('Westlands MedPoint', '$2b$10$QvQy2GHgVNp03FybB3O.t.MjZQK2pVSW2l2f7KDA7D4MKvwK5PZIO', 'Westlands', '3.1 km', '18 min', -1.264700, 36.803000, TRUE),
('Mtaa Chemist', '$2b$10$QvQy2GHgVNp03FybB3O.t.MjZQK2pVSW2l2f7KDA7D4MKvwK5PZIO', 'Eastleigh', '4.4 km', '25 min', -1.274000, 36.846000, FALSE),
('Lakeview Pharmacy', '$2b$10$QvQy2GHgVNp03FybB3O.t.MjZQK2pVSW2l2f7KDA7D4MKvwK5PZIO', 'Kisumu', '1.2 km', '12 min', -0.091700, 34.768000, TRUE),
('Coast Family Chemist', '$2b$10$QvQy2GHgVNp03FybB3O.t.MjZQK2pVSW2l2f7KDA7D4MKvwK5PZIO', 'Mombasa', '2.0 km', '14 min', -4.052600, 39.665000, TRUE),
('GreenCross Clinic Pharmacy', '$2b$10$QvQy2GHgVNp03FybB3O.t.MjZQK2pVSW2l2f7KDA7D4MKvwK5PZIO', 'Nairobi CBD', '1.8 km', '11 min', -1.283300, 36.816700, TRUE);

INSERT INTO inventory (pharmacy_id, medicine, category, quantity, price, status) VALUES
(1, 'Amoxicillin', 'Antibiotic', 24, 180, 'In stock'),
(2, 'Amoxicillin', 'Antibiotic', 8, 210, 'Low stock'),
(3, 'Amoxicillin', 'Antibiotic', 0, 195, 'Out of stock'),
(4, 'Insulin glargine', 'Diabetes', 5, 1280, 'Low stock'),
(5, 'Salbutamol inhaler', 'Respiratory', 16, 460, 'In stock'),
(6, 'Metformin', 'Diabetes', 31, 120, 'In stock'),
(1, 'Losartan', 'Blood pressure', 0, 340, 'Out of stock'),
(1, 'Paracetamol 500mg', 'Pain relief', 60, 50, 'In stock'),
(6, 'Paracetamol 500mg', 'Pain relief', 12, 45, 'In stock'),
(2, 'Ibuprofen 400mg', 'Pain relief', 18, 120, 'In stock'),
(3, 'Oral Rehydration Salts', 'Rehydration', 40, 60, 'In stock');

-- Only pharmacy-side charges now — no patient/customer payments.
INSERT INTO payments (type, amount, status) VALUES
('Monthly pharmacy subscription', 1500, 'Paid'),
('Sponsored listing', 750, 'Paid');