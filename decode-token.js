import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

// Replace this with your actual JWT token from the mobile app
const token = process.argv[2] || 'YOUR_JWT_TOKEN_HERE';

try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  console.log('Decoded JWT token:');
  console.log(JSON.stringify(decoded, null, 2));
  console.log('\nUser ID from token:', decoded.user_id);
} catch (err) {
  console.log('Token decode error:', err.message);
  console.log('\nMake sure to provide a valid JWT token as an argument:');
  console.log('node decode-token.js "your.jwt.token.here"');
}