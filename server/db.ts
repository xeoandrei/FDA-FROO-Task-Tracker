
import 'dotenv/config';
import mysql from 'mysql2/promise';

const databaseUrl = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3307),
  user: process.env.DB_USER || 'froo_user',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'froo_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

export const pool = mysql.createPool(databaseUrl);

export async function checkDatabaseConnection(): Promise<void> {
  const connection = await pool.getConnection();

  try {
    await connection.query('SELECT 1');
    console.log('✅ Connected to FROO MySQL database.');
  } finally {
    connection.release();
  }
}
