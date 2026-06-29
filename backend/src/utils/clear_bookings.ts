import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config();

import { Booking } from '../models/booking.model';
import { Invoice } from '../models/invoice.model';
import { Waiver } from '../models/waiver.model';
import { Notification } from '../models/notification.model';

const clearBookings = async () => {
  try {
    const connStr = process.env.MONGODB_URI;
    if (!connStr) {
      throw new Error("MONGODB_URI not found in environment variables.");
    }
    
    await mongoose.connect(connStr);
    console.log('Connected to MongoDB');

    const bookingResult = await Booking.deleteMany({});
    console.log(`Deleted ${bookingResult.deletedCount} bookings.`);

    const invoiceResult = await Invoice.deleteMany({}); 
    console.log(`Deleted ${invoiceResult.deletedCount} invoices.`);

    const waiverResult = await Waiver.deleteMany({});
    console.log(`Deleted ${waiverResult.deletedCount} waivers.`);

    const notifResult = await Notification.deleteMany({ title: 'New Booking' });
    console.log(`Deleted ${notifResult.deletedCount} notifications related to bookings.`);

    console.log('Successfully cleared all bookings and related data!');
    process.exit(0);
  } catch (err) {
    console.error('Failed to clear bookings:', err);
    process.exit(1);
  }
};

clearBookings();
