import { Request, Response } from 'express';
import { Booking } from '../models/booking.model';
import { Atv } from '../models/atv.model';
import { Waiver } from '../models/waiver.model';
import { User } from '../models/user.model';
import { InspectionLog } from '../models/inspection.model';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { Invoice } from '../models/invoice.model';
import { Payment } from '../models/payment.model';
import { Settings } from '../models/settings.model';
import { Notification } from '../models/notification.model';
import { isAtvBooked } from './atv.controller';
import { z } from 'zod';
import { Types } from 'mongoose';
import { getNextTgxNumber } from '../utils/counter.utils';

export const adminCreateBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    let { atvId, customerId, startDate, endDate, notes } = req.body;
    
    if (typeof startDate === 'string') {
      const datePart = startDate.split('T')[0];
      startDate = new Date(`${datePart}T12:00:00-04:00`);
    } else if (startDate instanceof Date) {
      const datePart = startDate.toISOString().split('T')[0];
      startDate = new Date(`${datePart}T12:00:00-04:00`);
    } else {
      startDate = new Date(startDate);
    }

    if (typeof endDate === 'string') {
      const datePart = endDate.split('T')[0];
      endDate = new Date(`${datePart}T12:00:00-04:00`);
    } else if (endDate instanceof Date) {
      const datePart = endDate.toISOString().split('T')[0];
      endDate = new Date(`${datePart}T12:00:00-04:00`);
    } else {
      endDate = new Date(endDate);
    }
    
    const atv = await Atv.findById(atvId);
    if (!atv) {
      res.status(404).json({ message: 'ATV not found' });
      return;
    }
    if (atv.status === 'MAINTENANCE' || atv.status === 'DECOMMISSIONED') {
      res.status(400).json({ message: `This ATV is currently under maintenance or decommissioned.` });
      return;
    }
    
    // Check overlapping
    const overlapping = await isAtvBooked(atvId, startDate, endDate);

    if (overlapping) {
      res.status(400).json({ message: 'ATV is already booked for these dates' });
      return;
    }

    const durationMs = new Date(endDate).getTime() - new Date(startDate).getTime();
    const durationDays = Math.max(1, Math.ceil(durationMs / (1000 * 3600 * 24)));
    const baseRate = durationDays * atv.ratePerDay;
    const tax = Math.round(baseRate * 0.1 * 100) / 100; // 10% tax
    const securityDeposit = 150; // Flat deposit
    const total = baseRate + tax + securityDeposit;

    const bookingNumber = await getNextTgxNumber('booking');
    const booking = await Booking.create({
      bookingNumber,
      atvId,
      customerId,
      startDate,
      endDate,
      status: 'Upcoming',
      notes
    });

    const invoiceNumber = await getNextTgxNumber('invoice');
    await Invoice.create({
      invoiceNumber,
      bookingId: booking._id,
      customerId,
      atvId,
      invoiceType: 'Rental Charge',
      description: 'Admin created reservation',
      amount: total,
      balance: total,
      status: 'Unpaid',
      dueDate: new Date(startDate)
    });

    res.status(201).json(booking);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create reservation', error: (error as Error).message });
  }
};

import { generateWaiverPDF, generateReceiptPDF } from '../utils/pdfGenerator';
import { sendEmail } from '../utils/notifications';
import { logActivity } from './logs.controller';

const createBookingSchema = z.object({
  atvId: z.string(),
  startDate: z.string().transform((val) => {
    const datePart = val.split('T')[0];
    return new Date(`${datePart}T12:00:00-04:00`);
  }),
  endDate: z.string().transform((val) => {
    const datePart = val.split('T')[0];
    return new Date(`${datePart}T12:00:00-04:00`);
  }),
  notes: z.string().optional()
});

const createCompleteBookingSchema = z.object({
  atvId: z.string(),
  startDate: z.string().transform((val) => {
    const datePart = val.split('T')[0];
    return new Date(`${datePart}T12:00:00-04:00`);
  }),
  endDate: z.string().transform((val) => {
    const datePart = val.split('T')[0];
    return new Date(`${datePart}T12:00:00-04:00`);
  }),
  notes: z.string().optional(),
  customerName: z.string().min(1, 'Name is required'),
  agreedToTerms: z.boolean().refine(val => val === true, {
    message: 'You must agree to the terms.'
  }),
  termsVersion: z.string(),
  passport: z.string().min(1, 'Passport / ID number is required'),
  signatureUrl: z.string().min(1, 'Signature URL is required'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional()
});

const signWaiverSchema = z.object({
  customerName: z.string().min(1, 'Name is required'),
  agreedToTerms: z.boolean().refine(val => val === true, {
    message: 'You must agree to the terms.'
  }),
  termsVersion: z.string(),
  passport: z.string().min(1, 'Passport / ID number is required'),
  paymentMethodId: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional()
});

const damageCheckSchema = z.object({
  part: z.string(),
  status: z.enum(['OK', 'SCRATCHED', 'DENTED', 'BROKEN']),
  notes: z.string().optional(),
  photoUrl: z.string().optional()
});

const inspectionSchema = z.object({
  type: z.enum(['CHECK_OUT', 'CHECK_IN']),
  odometer: z.number().nonnegative(),
  fuelLevel: z.number().min(0).max(100),
  damages: z.array(damageCheckSchema).default([]),
  staffName: z.string().optional(),
  signatureData: z.string().optional()
});

export const createBooking = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const parsed = createBookingSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: 'Invalid booking data input.', errors: parsed.error.format() });
      return;
    }

    const { atvId, startDate, endDate, notes } = parsed.data;

    // Validate dates
    if (startDate > endDate) {
      res.status(400).json({ message: 'Start date must be before end date.' });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (startDate < today) {
      res.status(400).json({ message: 'Start date cannot be in the past.' });
      return;
    }

    // Check ATV status and availability
    const atv = await Atv.findById(atvId);
    if (!atv) {
      res.status(404).json({ message: 'ATV not found.' });
      return;
    }

    if (atv.status === 'MAINTENANCE' || atv.status === 'DECOMMISSIONED') {
      res.status(400).json({ message: `This ATV is currently under maintenance or decommissioned.` });
      return;
    }

    const booked = await isAtvBooked(atvId, startDate, endDate);
    if (booked) {
      res.status(400).json({ message: 'ATV is already reserved for the selected date range.' });
      return;
    }

    // Pricing calculation
    const durationMs = endDate.getTime() - startDate.getTime();
    const durationDays = Math.max(1, Math.ceil(durationMs / (1000 * 60 * 60 * 24)) + 1);

    const settings = await Settings.findOne();
    const taxRate = settings?.baseTaxRate ? settings.baseTaxRate / 100 : 0.1;
    const securityDeposit = settings?.securityDeposit || 150;

    const baseRate = durationDays * atv.ratePerDay;
    const tax = Math.round(baseRate * taxRate * 100) / 100;
    const discount = 0;

    const bookingNumber = await getNextTgxNumber('booking');
    const newBooking = await Booking.create({
      bookingNumber,
      customerId: req.user._id,
      atvId: new Types.ObjectId(atvId),
      startDate,
      endDate,
      status: 'Pending', // PENDING waiver signature and payment
      notes
    });

    const shouldNotify = !settings || !settings.notifications || settings.notifications.newOrder !== false;
    if (shouldNotify) {
      await Notification.create({
        title: 'New Booking',
        message: `New booking #${bookingNumber} requires waiver and payment.`,
        link: '/admin/upcoming-bookings'
      });
    }

    res.status(201).json(newBooking);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create booking.', error: (error as Error).message });
  }
};

export const createCompleteBooking = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const parsed = createCompleteBookingSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: 'Invalid booking data input.', errors: parsed.error.format() });
      return;
    }

    const { atvId, startDate, endDate, notes, customerName, agreedToTerms, termsVersion, passport, signatureUrl, firstName, lastName, email, phone } = parsed.data;

    if (startDate > endDate) {
      res.status(400).json({ message: 'Start date must be before end date.' });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (startDate < today) {
      res.status(400).json({ message: 'Start date cannot be in the past.' });
      return;
    }

    const atv = await Atv.findById(atvId);
    if (!atv) {
      res.status(404).json({ message: 'ATV not found.' });
      return;
    }

    if (atv.status === 'MAINTENANCE' || atv.status === 'DECOMMISSIONED') {
      res.status(400).json({ message: `This ATV is currently under maintenance or decommissioned.` });
      return;
    }

    const booked = await isAtvBooked(atvId, startDate, endDate);
    if (booked) {
      res.status(400).json({ message: 'ATV is already reserved for the selected date range.' });
      return;
    }

    const user = await User.findById(req.user._id);
    if (user) {
      if (passport) user.passport = passport;
      if (firstName) user.firstName = firstName;
      if (lastName) user.lastName = lastName;
      if (email) user.email = email;
      if (phone) user.phone = phone;
      await user.save();
    }

    const bookingNumber = await getNextTgxNumber('booking');
    const newBooking = await Booking.create({
      bookingNumber,
      customerId: req.user._id,
      atvId: new Types.ObjectId(atvId),
      startDate,
      endDate,
      status: 'Customer Signed', 
      customerSignature: signatureUrl,
      customerSignedAt: new Date(),
      notes
    });

    const contractNumber = await getNextTgxNumber('contract');
    const waiver = await Waiver.create({
      contractNumber,
      bookingId: newBooking._id,
      customerName,
      agreedToTerms,
      ipAddress: req.ip || '127.0.0.1',
      termsVersion
    });

    newBooking.signedWaiverId = waiver._id as Types.ObjectId;
    await newBooking.save();

    const durationMs = endDate.getTime() - startDate.getTime();
    const durationDays = Math.max(1, Math.ceil(durationMs / (1000 * 60 * 60 * 24)) + 1);
    const settings = await Settings.findOne();
    const taxRate = settings?.baseTaxRate ? settings.baseTaxRate / 100 : 0.1;
    const securityDeposit = settings?.securityDeposit || 150;

    const baseRate = durationDays * atv.ratePerDay;
    const tax = Math.round(baseRate * taxRate * 100) / 100;
    const total = baseRate + tax + securityDeposit;

    const invoiceNumber = await getNextTgxNumber('invoice');
    await Invoice.create({
      invoiceNumber,
      bookingId: newBooking._id,
      customerId: req.user._id,
      atvId: new Types.ObjectId(atvId),
      invoiceType: 'Rental Charge',
      description: 'Standard ATV Rental',
      amount: total,
      balance: total,
      status: 'Unpaid',
      dueDate: new Date(startDate)
    });

    const shouldNotify = !settings || !settings.notifications || settings.notifications.newOrder !== false;
    if (shouldNotify) {
      await Notification.create({
        title: 'New Booking',
        message: `New booking #${bookingNumber} confirmed.`,
        link: '/admin/upcoming-bookings'
      });
    }

    const emailSubject = `Adventure Secured! Booking Confirmed - The Granja Xtreme`;
    const emailText = `Hi ${firstName || user?.firstName},\n\nYour ATV rental booking for the ${atv.name} (${atv.model}) has been successfully confirmed!\n\nBooking Details:\n- Booking ID: ${newBooking._id}\n- Start Date: ${startDate.toDateString()}\n- End Date: ${endDate.toDateString()}\n\nYou can access your contract in your dashboard: https://thegranjaxtreme.com/dashboard\n\nSee you on the trails!\n\nBest regards,\nThe Granja Xtreme Team`;
    
    await sendEmail(email || user?.email || '', emailSubject, emailText);
    await logActivity(`Complete booking created for ATV ${atv.model}`, req.user.email, req.ip || '', 'success');

    res.status(201).json({ message: 'Booking completed successfully', bookingId: newBooking._id });
  } catch (error) {
    res.status(500).json({ message: 'Failed to complete booking.', error: (error as Error).message });
  }
};

export const getMyBookings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const bookings = await Booking.find({ customerId: req.user._id, status: { $ne: 'Pending' } })
      .populate('atvId')
      .sort({ createdAt: -1 })
      .lean();

    // Attach invoice/payment info
    const bookingIds = bookings.map(b => b._id);
    const invoices = await Invoice.find({ bookingId: { $in: bookingIds } }).lean();
    const payments = await Payment.find({ bookingId: { $in: bookingIds } }).sort({ createdAt: -1 }).lean();
    
    const bookingsWithPayment = bookings.map(b => {
      const invoice = invoices.find(inv => inv.bookingId.toString() === b._id.toString());
      const paymentRec = payments.find(p => p.bookingId.toString() === b._id.toString() && p.paymentMethod !== 'Refund');
      return {
        ...b,
        finalTotal: invoice ? invoice.amount : 0,
        payment: invoice ? { 
          status: invoice.status, 
          method: paymentRec ? paymentRec.paymentMethod : 'Pending', 
          amountPaid: (invoice.amount - invoice.balance),
          remainingAmount: invoice.balance
        } : null
      };
    });

    res.status(200).json(bookingsWithPayment);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch your bookings.', error: (error as Error).message });
  }
};

export const getBookingById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id)
      .populate('atvId')
      .populate('customerId', 'firstName lastName email phone passport')
      .populate('signedWaiverId')
      .populate('checkOutLogId')
      .populate('checkInLogId');

    if (!booking) {
      res.status(404).json({ message: 'Booking not found.' });
      return;
    }

    // Access check: Admin/Staff OR owner of the booking
    if (
      req.user?.role === 'customer' &&
      booking.customerId._id.toString() !== req.user._id.toString()
    ) {
      res.status(403).json({ message: 'Access denied to this booking details.' });
      return;
    }

    const invoice = await Invoice.findOne({ bookingId: booking._id }).lean();
    const paymentRec = await Payment.findOne({ bookingId: booking._id, paymentMethod: { $ne: 'Refund' } }).sort({ createdAt: -1 }).lean();
    
    const bookingWithPayment = {
      ...booking.toObject(),
      finalTotal: invoice ? invoice.amount : 0,
      payment: invoice ? {
        status: invoice.status,
        method: paymentRec ? paymentRec.paymentMethod : 'Pending',
        amountPaid: (invoice.amount - invoice.balance),
        remainingAmount: invoice.balance
      } : null
    };

    if (req.user && (req.user.role === 'admin' || req.user.role === 'staff')) {
      try {
        const searchPattern = booking.bookingNumber ? booking.bookingNumber : booking._id.toString().substring(booking._id.toString().length - 6).toUpperCase();
        await Notification.updateMany(
          {
            isRead: false,
            message: { $regex: searchPattern }
          },
          { isRead: true }
        );
      } catch (e) {
        console.error('Failed to mark notifications as read', e);
      }
    }

    res.status(200).json(bookingWithPayment);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch booking details.', error: (error as Error).message });
  }
};

export const getAllBookings = async (_req: Request, res: Response): Promise<void> => {
  try {
    const bookings = await Booking.find({ status: { $ne: 'Pending' } })
      .populate('atvId')
      .populate('customerId', 'firstName lastName email phone passport')
      .sort({ createdAt: -1 })
      .lean();

    const bookingIds = bookings.map(b => b._id);
    const invoices = await Invoice.find({ bookingId: { $in: bookingIds } }).lean();
    const payments = await Payment.find({ bookingId: { $in: bookingIds } }).sort({ createdAt: -1 }).lean();
    
    const bookingsWithPayment = bookings.map(b => {
      const invoice = invoices.find(inv => inv.bookingId.toString() === b._id.toString());
      const paymentRec = payments.find(p => p.bookingId.toString() === b._id.toString() && p.paymentMethod !== 'Refund');
      return {
        ...b,
        finalTotal: invoice ? invoice.amount : 0,
        payment: invoice ? { 
          status: invoice.status, 
          method: paymentRec ? paymentRec.paymentMethod : 'Pending', 
          amountPaid: (invoice.amount - invoice.balance),
          remainingAmount: invoice.balance 
        } : null
      };
    });

    res.status(200).json(bookingsWithPayment);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch bookings list.', error: (error as Error).message });
  }
};

export const signWaiver = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const parsed = signWaiverSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: 'Invalid waiver inputs.', errors: parsed.error.format() });
      return;
    }

    const { customerName, agreedToTerms, termsVersion, passport, firstName, lastName, email, phone } = parsed.data;

    const booking = await Booking.findById(id).populate('atvId').populate('customerId');
    if (!booking) {
      res.status(404).json({ message: 'Booking not found.' });
      return;
    }

    // Access check
    if (
      req.user?.role === 'customer' &&
      booking.customerId._id.toString() !== req.user._id.toString()
    ) {
      res.status(403).json({ message: 'Access denied.' });
      return;
    }

    if (booking.customerId) {
      const user = await User.findById(booking.customerId._id);
      if (user) {
        if (passport) user.passport = passport;
        if (firstName) user.firstName = firstName;
        if (lastName) user.lastName = lastName;
        if (email) user.email = email;
        if (phone) user.phone = phone;
        await user.save();
      }
    }

    const contractNumber = await getNextTgxNumber('contract');
    const waiver = await Waiver.create({
      contractNumber,
      bookingId: booking._id,
      customerName,
      agreedToTerms,
      ipAddress: req.ip || '127.0.0.1',
      termsVersion
    });

    booking.signedWaiverId = waiver._id as Types.ObjectId;
    await booking.save();

    // Create Invoice when waiver is signed and booking becomes Upcoming
    const durationMs = booking.endDate.getTime() - booking.startDate.getTime();
    const durationDays = Math.max(1, Math.ceil(durationMs / (1000 * 60 * 60 * 24)) + 1);
    const atv: any = booking.atvId;
    const settings = await Settings.findOne();
    const taxRate = settings?.baseTaxRate ? settings.baseTaxRate / 100 : 0.1;
    const securityDeposit = settings?.securityDeposit || 150;

    const baseRate = durationDays * (atv?.ratePerDay || 0);
    const tax = Math.round(baseRate * taxRate * 100) / 100;
    const total = baseRate + tax + securityDeposit;

    const invoiceNumber = await getNextTgxNumber('invoice');
    await Invoice.create({
      invoiceNumber,
      bookingId: booking._id,
      customerId: booking.customerId._id,
      atvId: booking.atvId._id,
      invoiceType: 'Rental Charge',
      description: 'Standard ATV Rental',
      amount: total,
      balance: total,
      status: 'Unpaid',
      dueDate: new Date(booking.startDate)
    });

    booking.status = 'Pending Signature';
    await booking.save();

    await logActivity(`Signed waiver for booking ${booking._id}`, (req as any).user?.email || 'customer', req.ip || '', 'success');

    res.status(200).json({ message: 'Waiver signed and reservation confirmed successfully.', booking, waiver });
  } catch (error) {
    res.status(500).json({ message: 'Failed to sign waiver.', error: (error as Error).message });
  }
};

export const uploadCustomerSignature = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { signatureUrl } = req.body;
    
    if (!signatureUrl) {
      res.status(400).json({ message: 'Signature URL is required.' });
      return;
    }

    const booking = await Booking.findById(id).populate('atvId').populate('customerId');
    if (!booking) {
      res.status(404).json({ message: 'Booking not found.' });
      return;
    }

    if (
      req.user?.role === 'customer' &&
      booking.customerId._id.toString() !== req.user._id.toString()
    ) {
      res.status(403).json({ message: 'Access denied.' });
      return;
    }

    booking.customerSignature = signatureUrl;
    booking.customerSignedAt = new Date();
    booking.status = 'Customer Signed';
    await booking.save();

    // Send the email here since booking is now officially confirmed by customer
    const userObj = booking.customerId as any;
    const atvObj = booking.atvId as any;

    const emailSubject = `Adventure Secured! Booking Confirmed - The Granja Xtreme`;
    const emailText = `Hi ${userObj.firstName},\n\nYour ATV rental booking for the ${atvObj.name} (${atvObj.model}) has been successfully confirmed!\n\nBooking Details:\n- Booking ID: ${booking._id}\n- Start Date: ${new Date(booking.startDate).toDateString()}\n- End Date: ${new Date(booking.endDate).toDateString()}\n\nYou can access your contract in your dashboard: https://thegranjaxtreme.com/dashboard\n\nSee you on the trails!\n\nBest regards,\nThe Granja Xtreme Team`;
    
    await sendEmail(userObj.email, emailSubject, emailText);

    res.status(200).json({ message: 'Customer signature saved successfully.', booking });
  } catch (error) {
    res.status(500).json({ message: 'Failed to save customer signature.', error: (error as Error).message });
  }
};

export const uploadAdminSignature = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { signatureUrl } = req.body;

    if (!signatureUrl) {
      res.status(400).json({ message: 'Signature URL is required.' });
      return;
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      res.status(404).json({ message: 'Booking not found.' });
      return;
    }

    booking.adminSignature = signatureUrl;
    booking.adminSignedAt = new Date();
    
    // Once admin signs, if we want to change status to 'Upcoming' for the rental lifecycle
    booking.status = 'Upcoming'; 
    await booking.save();

    res.status(200).json({ message: 'Admin signature saved successfully.', booking });
  } catch (error) {
    res.status(500).json({ message: 'Failed to save admin signature.', error: (error as Error).message });
  }
};

export const logInspection = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const parsed = inspectionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: 'Invalid inspection parameters.', errors: parsed.error.format() });
      return;
    }

    const { type, odometer, fuelLevel, damages, staffName, signatureData } = parsed.data;

    const booking = await Booking.findById(id);
    if (!booking) {
      res.status(404).json({ message: 'Booking not found.' });
      return;
    }

    const atv = await Atv.findById(booking.atvId);
    if (!atv) {
      res.status(404).json({ message: 'ATV associated with booking not found.' });
      return;
    }

    const inspection = await InspectionLog.create({
      bookingId: booking._id,
      type,
      staffId: req.user?._id,
      staffName,
      signatureData,
      odometer,
      fuelLevel,
      damages
    });

    if (type === 'CHECK_OUT') {
      booking.checkOutLogId = inspection._id as Types.ObjectId;
      booking.status = 'Active';
      atv.status = 'RENTED';
      atv.currentOdometer = odometer;
      atv.currentFuelLevel = fuelLevel;
    } else {
      // CHECK_IN
      booking.checkInLogId = inspection._id as Types.ObjectId;
      booking.status = 'Completed';

      // Check if any damage is broken or requires maintenance
      const hasBrokenParts = damages.some((d) => d.status === 'BROKEN');
      if (hasBrokenParts) {
        atv.status = 'MAINTENANCE';
      } else {
        atv.status = 'AVAILABLE';
      }

      // Add damages to ATV damage history
      damages.forEach((d) => {
        if (d.status !== 'OK') {
          atv.damageLogs.push({
            part: d.part,
            description: d.notes || `${d.status} discovered during check-in.`,
            photoUrl: d.photoUrl,
            loggedAt: new Date()
          });
        }
      });

      atv.currentOdometer = odometer;
      atv.currentFuelLevel = fuelLevel;
    }

    await booking.save();
    await atv.save();

    await logActivity(`Logged ${type} inspection for booking ${booking._id}`, req.user?.email || 'admin', req.ip || '', 'info');

    res.status(200).json({ message: `${type} inspection logged successfully.`, booking, inspection });
  } catch (error) {
    res.status(500).json({ message: 'Failed to log inspection.', error: (error as Error).message });
  }
};

export const updateBookingStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ['Upcoming', 'Active', 'Completed', 'Cancelled'];
    if (!allowedStatuses.includes(status)) {
      res.status(400).json({ message: 'Invalid booking status.' });
      return;
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      res.status(404).json({ message: 'Booking not found.' });
      return;
    }

    if (status === 'Upcoming' || status === 'Active') {
      const isOverlapping = await isAtvBooked(booking.atvId.toString(), booking.startDate, booking.endDate, booking._id.toString());
      if (isOverlapping) {
        res.status(400).json({ message: 'Cannot update status. The ATV is already booked for these dates.' });
        return;
      }
    }

    booking.status = status;
    await booking.save();

    // Sync ATV state when booking status is updated manually
    if (status === 'Cancelled' || status === 'Completed') {
      const atv = await Atv.findById(booking.atvId);
      if (atv && atv.status === 'RENTED') {
        atv.status = 'AVAILABLE';
        await atv.save();
      }
    } else if (status === 'Active') {
      const atv = await Atv.findById(booking.atvId);
      if (atv && atv.status === 'AVAILABLE') {
        atv.status = 'RENTED';
        await atv.save();
      }
    }

    await logActivity(`Updated booking ${booking._id} status to ${status}`, req.user?.email || 'admin', req.ip || '', 'warning');

    res.status(200).json({ message: 'Booking status updated.', booking });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update status.', error: (error as Error).message });
  }
};

export const getWaiverPDF = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id).populate('atvId').populate('customerId');
    if (!booking) {
      res.status(404).json({ message: 'Booking not found.' });
      return;
    }

    if (
      req.user?.role === 'customer' &&
      booking.customerId._id.toString() !== req.user._id.toString()
    ) {
      res.status(403).json({ message: 'Access denied.' });
      return;
    }

    const waiver = await Waiver.findOne({ bookingId: booking._id });
    if (!waiver) {
      res.status(404).json({ message: 'No signed waiver found for this booking.' });
      return;
    }

    const language = (req.query.lang as 'EN' | 'ES') || 'EN';
    const pdfBuffer = await generateWaiverPDF(booking, waiver, language);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Contract-${id}-${language}.pdf`);
    res.status(200).send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ message: 'Failed to generate PDF waiver.', error: (error as Error).message });
  }
};

export const getReceiptPDF = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id).populate('atvId').populate('customerId');
    if (!booking) {
      res.status(404).json({ message: 'Booking not found.' });
      return;
    }

    if (
      req.user?.role === 'customer' &&
      booking.customerId._id.toString() !== req.user._id.toString()
    ) {
      res.status(403).json({ message: 'Access denied.' });
      return;
    }

    const pdfBuffer = await generateReceiptPDF(booking);
    
    await logActivity(`Generated receipt PDF for booking ${booking._id}`, req.user?.email || 'admin', req.ip || '', 'info');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Receipt-${id}.pdf`);
    res.status(200).send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ message: 'Failed to generate PDF receipt.', error: (error as Error).message });
  }
};

export const collectPayment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params; // booking id
    const { amount, method, invoiceId } = req.body;

    const invoiceQuery: any = { status: { $ne: 'Paid' } };
    if (invoiceId) {
      const Types = require('mongoose').Types;
      invoiceQuery._id = new Types.ObjectId(invoiceId);
    } else {
      invoiceQuery.bookingId = id;
    }

    console.log('collectPayment -> id:', id, 'invoiceId:', invoiceId, 'invoiceQuery:', invoiceQuery);

    const invoice = await Invoice.findOne(invoiceQuery);
    if (!invoice) {
      res.status(404).json({ message: 'No unpaid invoice found for this payment.' });
      return;
    }

    if (amount <= 0 || amount > invoice.balance) {
      res.status(400).json({ message: 'Invalid payment amount.' });
      return;
    }

    invoice.balance -= amount;
    if (invoice.balance <= 0) {
      invoice.status = 'Paid';
    } else {
      invoice.status = 'Partially Paid';
    }
    await invoice.save();

    const receiptNumber = await getNextTgxNumber('receipt');
    await Payment.create({
      receiptNumber,
      invoiceId: invoice._id,
      bookingId: id,
      customerId: invoice.customerId,
      amount,
      paymentMethod: method || 'Cash',
      status: 'Paid',
      collectedBy: req.user?._id
    });

    await logActivity(`Collected payment $${amount} for booking ${id}`, req.user?.email || 'admin', req.ip || '', 'success');

    res.status(200).json({ message: 'Payment collected successfully.', invoice });
  } catch (error) {
    res.status(500).json({ message: 'Failed to collect payment.', error: (error as Error).message });
  }
};

export const checkinBooking = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { actualCheckInTime, notes, accessories } = req.body;
    
    const booking = await Booking.findById(id).populate('atvId');
    if (!booking) { res.status(404).json({message: 'Booking not found.'}); return; }

    booking.status = 'Active';
    booking.actualCheckInTime = actualCheckInTime ? new Date(actualCheckInTime) : new Date();
    if (notes) booking.notes = notes;

    if (accessories && Array.isArray(accessories) && accessories.length > 0) {
      booking.accessories = accessories;
      
      const accessoriesSum = accessories.reduce((acc, item) => acc + (item.price * item.quantity), 0);
      
      if (accessoriesSum > 0) {
        const mainInvoice = await Invoice.findOne({ bookingId: booking._id, invoiceType: 'Rental Charge' });
        
        if (mainInvoice) {
          mainInvoice.amount += accessoriesSum;
          mainInvoice.balance += accessoriesSum;
          mainInvoice.status = mainInvoice.balance > 0 ? (mainInvoice.amount > mainInvoice.balance ? 'Partially Paid' : 'Unpaid') : 'Paid';
          
          const accessoryDetails = accessories.map(a => `${a.quantity}x ${a.name} ($${(a.price * a.quantity).toFixed(2)})`).join(', ');
          mainInvoice.description = `${mainInvoice.description}\n+ Accessories: ${accessoryDetails}`;
          
          await mainInvoice.save();
        } else {
          // Fallback if main invoice is somehow missing
          const invoiceNumber = await getNextTgxNumber('invoice');
          await Invoice.create({
            invoiceNumber,
            bookingId: booking._id,
            customerId: booking.customerId,
            atvId: booking.atvId,
            invoiceType: 'Extra Charge',
            description: `Accessories: ${accessories.map(a => `${a.quantity}x ${a.name} ($${(a.price * a.quantity).toFixed(2)})`).join(', ')}`,
            amount: accessoriesSum,
            balance: accessoriesSum,
            status: 'Unpaid',
            dueDate: new Date()
          });
        }
      }
    }

    const atv = booking.atvId as any;
    if (atv) {
      atv.status = 'RENTED';
      await atv.save();
    }
    await booking.save();
    
    res.status(200).json({ message: 'Checked in successfully.', booking });
  } catch (error) {
    res.status(500).json({ message: 'Failed to check in.', error: (error as Error).message });
  }
};

export const checkoutBooking = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { actualCheckOutTime, extraCharges, processRefund } = req.body;

    const booking = await Booking.findById(id).populate('atvId');
    if (!booking) { res.status(404).json({message: 'Booking not found.'}); return; }

    booking.status = 'Completed';
    booking.actualCheckOutTime = actualCheckOutTime ? new Date(actualCheckOutTime) : new Date();

    let extrasSum = 0;

    if (extraCharges && Array.isArray(extraCharges) && extraCharges.length > 0) {
      booking.extraCharges = extraCharges;
      extrasSum = extraCharges.reduce((acc, charge) => acc + Number(charge.amount), 0);
      booking.finalTotal = (booking.finalTotal || 0) + extrasSum;
      
      const mainInvoice = await Invoice.findOne({ bookingId: booking._id, invoiceType: 'Rental Charge' });
      
      if (mainInvoice) {
        mainInvoice.amount += extrasSum;
        mainInvoice.balance += extrasSum;
        mainInvoice.status = mainInvoice.balance > 0 ? (mainInvoice.amount > mainInvoice.balance ? 'Partially Paid' : 'Unpaid') : 'Paid';
        
        const extraDetails = extraCharges.map(c => `[${c.reason}] ${c.description} ($${Number(c.amount).toFixed(2)})`).join(', ');
        mainInvoice.description = `${mainInvoice.description}\n+ Extra Charges: ${extraDetails}`;
        
        await mainInvoice.save();
      } else {
        const invoiceNumber = await getNextTgxNumber('invoice');
        
        await Invoice.create({
          invoiceNumber,
          bookingId: booking._id,
          customerId: booking.customerId,
          atvId: booking.atvId,
          invoiceType: 'Extra Charge',
          description: `Extra Charges: ${extraCharges.map(c => `[${c.reason}] ${c.description} ($${Number(c.amount).toFixed(2)})`).join(', ')}`,
          amount: extrasSum,
          balance: extrasSum,
          status: 'Unpaid',
          dueDate: new Date()
        });
      }
    }

    if (processRefund) {
      const settings = await Settings.findOne();
      const securityDeposit = settings?.securityDeposit || 150;
      const refundAmount = Math.max(0, securityDeposit - extrasSum);
      booking.depositRefunded = true;
      booking.depositRefundedAmount = refundAmount;

      if (refundAmount > 0) {
        const mainInvoice = await Invoice.findOne({ bookingId: booking._id, invoiceType: 'Rental Charge' });
        if (mainInvoice) {
          mainInvoice.amount -= refundAmount;
          mainInvoice.balance = Math.max(0, mainInvoice.balance - refundAmount);
          mainInvoice.description = `${mainInvoice.description}\n- Deposit Refund: $${refundAmount.toFixed(2)}`;
          await mainInvoice.save();
          
          const receiptNumber = await getNextTgxNumber('receipt');
          await Payment.create({
            receiptNumber,
            invoiceId: mainInvoice._id,
            bookingId: booking._id,
            customerId: booking.customerId,
            amount: -refundAmount,
            paymentMethod: 'Refund',
            status: 'Refunded',
            collectedBy: req.user?._id
          });
        }
      }
    }

    const atv = booking.atvId as any;
    if (atv) {
      atv.status = 'AVAILABLE';
      await atv.save();
    }
    await booking.save();

    res.status(200).json({ message: 'Checked out successfully.', booking });
  } catch (error) {
    res.status(500).json({ message: 'Failed to check out.', error: (error as Error).message });
  }
};
