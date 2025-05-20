const pool = require('./config/db');

async function testConnection() {
  try {
    const [rows] = await pool.query('SELECT 6 + 1 AS solution');
    console.log('Database connectiosn successful! Reult:', rows[0].solution);
  } catch (err) {
    console.error('Database connection failed:', err);
  } finally {
    pool.end();
  }
}

testConnection();