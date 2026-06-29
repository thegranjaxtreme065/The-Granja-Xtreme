import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const clearBookings = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected to DB');
    
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('db is undefined');
    }

    // We will clear specific collections instead of dropping everything to preserve ATVs, Users, Settings, Accessories, etc.
    const collectionsToClear = [
      'bookings',
      'invoices',
      'payments',
      'waivers'
    ];

    for (const collectionName of collectionsToClear) {
      try {
        await db.collection(collectionName).deleteMany({});
        console.log(`Cleared ${collectionName}`);
      } catch (err: any) {
        console.log(`Could not clear ${collectionName}: ${err.message}`);
      }
    }
    
    console.log('Successfully cleared all bookings and related data.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

clearBookings();
