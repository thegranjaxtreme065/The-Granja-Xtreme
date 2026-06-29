import { Schema, model, Types } from 'mongoose';

export interface IPayment {
  receiptNumber: string;
  invoiceId: Types.ObjectId;
  bookingId: Types.ObjectId;
  customerId: Types.ObjectId;
  amount: number;
  paymentMethod: 'PayPal' | 'International Card' | 'Banco Popular' | 'Banreservas' | 'Zelle' | 'Cash' | 'Apple Pay' | 'Google Pay' | 'Refund';
  collectedBy: Types.ObjectId;
  collectionDate: Date;
  status: 'Pending' | 'Paid' | 'Cancelled' | 'Refunded';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    receiptNumber: { type: String, required: true, unique: true },
    invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice', required: true },
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    paymentMethod: { 
      type: String, 
      enum: ['PayPal', 'International Card', 'Banco Popular', 'Banreservas', 'Zelle', 'Cash', 'Apple Pay', 'Google Pay', 'Refund'], 
      required: true 
    },
    collectedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    collectionDate: { type: Date, required: true, default: Date.now },
    status: { 
      type: String, 
      enum: ['Pending', 'Paid', 'Cancelled', 'Refunded'], 
      default: 'Paid' 
    },
    notes: { type: String }
  },
  { timestamps: true }
);

export const Payment = model<IPayment>('Payment', paymentSchema);
