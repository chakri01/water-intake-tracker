import { MongoClient, ObjectId } from 'mongodb';
import { NextResponse } from 'next/server';

const uri = process.env.MONGO_URL;
let cachedClient = null;

async function connectToDatabase() {
  if (cachedClient) {
    return cachedClient;
  }
  const client = new MongoClient(uri);
  await client.connect();
  cachedClient = client;
  return client;
}

// Seed default users
async function seedUsers(db) {
  const users = [
    { name: 'Nikhil', dailyGoal: 3000, color: '#3B82F6' },
    { name: 'Karthik', dailyGoal: 3000, color: '#10B981' },
    { name: 'Prabhath', dailyGoal: 3000, color: '#F59E0B' },
    { name: 'Samson', dailyGoal: 3000, color: '#EF4444' },
    { name: 'Chakri', dailyGoal: 3000, color: '#8B5CF6' },
    { name: 'Praveen', dailyGoal: 3000, color: '#EC4899' }
  ];

  const usersCollection = db.collection('users');
  const existingCount = await usersCollection.countDocuments();
  
  if (existingCount === 0) {
    await usersCollection.insertMany(users);
    return { message: 'Users seeded successfully', count: users.length };
  }
  
  return { message: 'Users already exist', count: existingCount };
}

export async function GET(request) {
  try {
    const client = await connectToDatabase();
    const db = client.db('water_tracker');
    const url = new URL(request.url);
    const path = url.pathname.replace('/api/', '');

    // Seed users endpoint
    if (path === 'seed') {
      const result = await seedUsers(db);
      return NextResponse.json(result);
    }

    // Get all users
    if (path === 'users') {
      const users = await db.collection('users').find({}).toArray();
      return NextResponse.json(users);
    }

    // Get specific user
    if (path.startsWith('users/')) {
      const userId = path.split('/')[1];
      const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      return NextResponse.json(user);
    }

    // Get water logs
    if (path === 'water-logs') {
      const userId = url.searchParams.get('userId');
      const startDate = url.searchParams.get('startDate');
      const endDate = url.searchParams.get('endDate');

      const query = {};
      if (userId) {
        query.userId = userId;
      }
      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate);
        if (endDate) query.timestamp.$lte = new Date(endDate);
      }

      const logs = await db.collection('water_logs').find(query).sort({ timestamp: -1 }).toArray();
      return NextResponse.json(logs);
    }

    // Get today's intake for all users
    if (path === 'today-intake') {
      const users = await db.collection('users').find({}).toArray();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const intakeData = await Promise.all(
        users.map(async (user) => {
          const logs = await db.collection('water_logs')
            .find({
              userId: user._id.toString(),
              timestamp: { $gte: today, $lt: tomorrow }
            })
            .toArray();
          
          const total = logs.reduce((sum, log) => sum + log.amount, 0);
          return {
            ...user,
            todayIntake: total
          };
        })
      );

      return NextResponse.json(intakeData);
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    console.error('GET Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const client = await connectToDatabase();
    const db = client.db('water_tracker');
    const url = new URL(request.url);
    const path = url.pathname.replace('/api/', '');
    const body = await request.json();

    // Log water intake
    if (path === 'water-logs') {
      const { userId, amount } = body;
      if (!userId || !amount) {
        return NextResponse.json({ error: 'userId and amount are required' }, { status: 400 });
      }

      const log = {
        userId,
        amount: parseInt(amount),
        timestamp: new Date()
      };

      const result = await db.collection('water_logs').insertOne(log);
      return NextResponse.json({ ...log, _id: result.insertedId });
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    console.error('POST Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const client = await connectToDatabase();
    const db = client.db('water_tracker');
    const url = new URL(request.url);
    const path = url.pathname.replace('/api/', '');
    const body = await request.json();

    // Update user's daily goal
    if (path.startsWith('users/')) {
      const userId = path.split('/')[1];
      const { dailyGoal } = body;
      
      if (!dailyGoal) {
        return NextResponse.json({ error: 'dailyGoal is required' }, { status: 400 });
      }

      const result = await db.collection('users').updateOne(
        { _id: new ObjectId(userId) },
        { $set: { dailyGoal: parseInt(dailyGoal) } }
      );

      if (result.matchedCount === 0) {
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