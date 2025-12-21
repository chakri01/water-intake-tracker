import { NextResponse } from 'next/server';
import { Pool } from 'pg';

// Create a connection pool for Postgres
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});
// Validate DATABASE_URL is available
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set');
}

// Get database connection
async function getConnection() {
  return pool;
}

// Seed default users
async function seedUsers(pool) {
  const users = [
    { name: 'Nikhil', daily_goal_ml: 3000 },
    { name: 'Karthik', daily_goal_ml: 3000 },
    { name: 'Prabhath', daily_goal_ml: 3000 },
    { name: 'Samson', daily_goal_ml: 3000 },
    { name: 'Chakri', daily_goal_ml: 3000 },
    { name: 'Praveen', daily_goal_ml: 3000 }
  ];

  try {
    // Check if users already exist
    const result = await pool.query('SELECT COUNT(*) as count FROM users');
    const count = parseInt(result.rows[0].count);

    if (count === 0) {
      // Insert users
      for (const user of users) {
        await pool.query(
          'INSERT INTO users (name, daily_goal_ml) VALUES ($1, $2)',
          [user.name, user.daily_goal_ml]
        );
      }
      return { message: 'Users seeded successfully', count: users.length };
    }

    return { message: 'Users already exist', count };
  } catch (error) {
    console.error('Seed error:', error);
  return { message: 'Seed error', error: error.message };  }
}

export async function GET(request) {
  const db = await getConnection();
  try {
    const url = new URL(request.url);
    const path = url.pathname.replace('/api/', '');

    // Seed users endpoint
    if (path === 'seed') {
      const result = await seedUsers(db);
      return NextResponse.json(result);
    }

    // Get all users
    if (path === 'users') {
      const result = await db.query('SELECT * FROM users ORDER BY created_at DESC');
      const users = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        dailyGoal: row.daily_goal_ml,
        createdAt: row.created_at
      }));
      return NextResponse.json(users);
    }

    // Get specific user
    if (path.startsWith('users/')) {
      const userId = path.split('/')[1];
      const result = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      const user = result.rows[0];
      return NextResponse.json({
        id: user.id,
        name: user.name,
        dailyGoal: user.daily_goal_ml,
        createdAt: user.created_at
      });
    }

    // Get water logs
    if (path === 'water-logs') {
      const userId = url.searchParams.get('userId');
      const startDate = url.searchParams.get('startDate');
      const endDate = url.searchParams.get('endDate');

      let query = 'SELECT * FROM water_logs WHERE 1=1';
      const params = [];

      if (userId) {
        params.push(userId);
        query += ` AND user_id = $${params.length}`;
      }

      if (startDate) {
        params.push(new Date(startDate));
        query += ` AND logged_at >= $${params.length}`;
      }

      if (endDate) {
        params.push(new Date(endDate));
        query += ` AND logged_at <= $${params.length}`;
      }

      query += ' ORDER BY logged_at DESC';

      const result = await db.query(query, params);
      const logs = result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        amountMl: row.amount_ml,
        loggedAt: row.logged_at
      }));
      return NextResponse.json(logs);
    }

    // Get today's intake for all users
    if (path === 'today-intake') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const result = await db.query(`
        SELECT u.*, COALESCE(SUM(w.amount_ml), 0) as today_intake
        FROM users u
        LEFT JOIN water_logs w ON u.id = w.user_id 
          AND w.logged_at >= $1 AND w.logged_at < $2
        GROUP BY u.id
        ORDER BY u.created_at DESC
      `, [today, tomorrow]);

      const intakeData = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        dailyGoal: row.daily_goal_ml,
        todayIntake: parseInt(row.today_intake) || 0,
        createdAt: row.created_at
      }));
      return NextResponse.json(intakeData);
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    console.error('GET Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const db = await getConnection();
  try {
    const url = new URL(request.url);
    const path = url.pathname.replace('/api/', '');
    const body = await request.json();

    // Log water intake
    if (path === 'water-logs') {
      const { userId, amount } = body;
      if (!userId || !amount) {
        return NextResponse.json(
          { error: 'userId and amount are required' },
          { status: 400 }
        );
      }

      const result = await db.query(
        'INSERT INTO water_logs (user_id, amount_ml, logged_at) VALUES ($1, $2, NOW()) RETURNING *',
        [userId, parseInt(amount)]
      );

      const log = result.rows[0];
      return NextResponse.json({
        id: log.id,
        userId: log.user_id,
        amountMl: log.amount_ml,
        loggedAt: log.logged_at
      });
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    console.error('POST Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  const db = await getConnection();
  try {
    const url = new URL(request.url);
    const path = url.pathname.replace('/api/', '');
    const body = await request.json();

    // Update user's daily goal
    if (path.startsWith('users/')) {
      const userId = path.split('/')[1];
      const { dailyGoal } = body;

      if (!dailyGoal) {
        return NextResponse.json(
          { error: 'dailyGoal is required' },
          { status: 400 }
        );
      }

      const result = await db.query(
        'UPDATE users SET daily_goal_ml = $1 WHERE id = $2 RETURNING *',
        [parseInt(dailyGoal), userId]
      );

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    console.error('PUT Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
