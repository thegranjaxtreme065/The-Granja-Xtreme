import { Schema, model, Types } from 'mongoose';

export interface IBooking {
  bookingNumber: string;
  customerId: Types.ObjectId;
  atvId: Types.ObjectId;
  startDate: Date;
  endDate: Date;
  actualCheckInTime?: Date;
  actualCheckOutTime?: Date;
  extraCharges?: {
    reason: string;
    description: string;
    amount: number;
  }[];
  accessories?: {
    accessoryId: Types.ObjectId;
    name: string;
    quantity: number;
    price: number;
  }[];
  finalTotal?: number;
  depositRefunded?: boolean;
  depositRefundedAmount?: number;
  status: 'Pending' | 'Pending Signature' | 'Customer Signed' | 'Upcoming' | 'Active' | 'Completed' | 'Cancelled';
  signedWaiverId?: Types.ObjectId;
  checkOutLogId?: Types.ObjectId;
  checkInLogId?: Types.ObjectId;
  customerSignature?: string;
  adminSignature?: string;
  customerSignedAt?: Date;
  adminSignedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const bookingSchema = new Schema<IBooking>(
  {
    bookingNumber: { type: String, required: true, unique: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    atvId: { type: Schema.Types.ObjectId, ref: 'Atv', required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    actualCheckInTime: { type: Date },
    actualCheckOutTime: { type: Date },
    extraCharges: [{
      reason: { type: String, required: true },
      description: { type: String, required: true },
      amount: { type: Number, required: true }
    }],
    accessories: [{
      accessoryId: { type: Schema.Types.ObjectId, ref: 'Accessory', required: true },
      name: { type: String, required: true },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true }
    }],
    finalTotal: { type: Number },
    depositRefunded: { type: Boolean, default: false },
    depositRefundedAmount: { type: Number, default: 0 },
    status: {  
      type: String, 
      enum: ['Pending', 'Pending Signature', 'Customer Signed', 'Upcoming', 'Active', 'Completed', 'Cancelled'], 
      default: 'Upcoming' 
    },
    signedWaiverId: { type: Schema.Types.ObjectId, ref: 'Waiver' },
    checkOutLogId: { type: Schema.Types.ObjectId, ref: 'InspectionLog' },
    checkInLogId: { type: Schema.Types.ObjectId, ref: 'InspectionLog' },
    customerSignature: { type: String },
    adminSignature: { type: String },
    customerSignedAt: { type: Date },
    adminSignedAt: { type: Date },
    notes: { type: String }
  },
  { timestamps: true }
);

export const Booking = model<IBooking>('Booking', bookingSchema);
