import { checkDatabaseConnection, pool } from './db';

async function main() {
  try {
    await checkDatabaseConnection();

    const [rows] = await pool.query(
      'SELECT DATABASE() AS db, @@port AS port'
    );

    console.log('Database verification:', rows);
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();