-- Grant premium plan to admin's hotel
UPDATE hotels
SET plan = 'premium'
WHERE id = (SELECT hotel_id FROM users WHERE email = 'admin@upstar.com');
