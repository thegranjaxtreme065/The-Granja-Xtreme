import mongoose from 'mongoose';
import { Booking } from './src/models/booking.model';
import { isAtvBooked } from './src/controllers/atv.controller';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/granja_xtreme');
  
  const atvId = "667afdc0b1f21abfae113c01"; // we'll just test the query logic with any ID
  const testDate = new Date('2026-06-29T12:00:00-04:00');
  
  // Find a booking that we know exists
  const booking = await Booking.findOne({}).sort({ createdAt: -1 });
  console.log("Latest booking:", booking?._id, booking?.startDate, booking?.endDate, booking?.status);
  
  if (booking) {
    const isBooked = await isAtvBooked(booking.atvId.toString(), booking.startDate, booking.endDate);
    console.log("isAtvBooked result for exact same dates:", isBooked);
  }
  
  process.exit(0);
}
run();
