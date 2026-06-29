import { Request, Response } from 'express';
import { Atv } from '../models/atv.model';
import { Booking } from '../models/booking.model';
import { z } from 'zod';
import { logActivity } from './logs.controller';

const specsSchema = z.object({
  displacement: z.string().min(1),
  fuelCapacity: z.string().min(1),
  weightLimit: z.string().min(1)
});

const createAtvSchema = z.object({
  name: z.string().min(1),
  nameEs: z.string().optional(),
  model: z.string().min(1),
  year: z.number().int().min(1900),
  ratePerDay: z.number().positive(),
  hourlyRate: z.number().positive(),
  description: z.string().min(1),
  specs: specsSchema,
  images: z.array(z.string()).default([]),
  category: z.string().optional(),
  unitNumber: z.string().optional(),
  color: z.string().optional(),
  currentOdometer: z.number().nonnegative().default(0),
  currentFuelLevel: z.number().min(0).max(100).default(100)
});

const maintenanceSchema = z.object({
  serviceType: z.string().min(1),
  description: z.string().min(1),
  cost: z.number().nonnegative(),
  completedAt: z.string().transform((val) => new Date(val)),
  mileageAtService: z.number().optional()
});

const damageLogSchema = z.object({
  part: z.string().min(1),
  description: z.string().min(1),
  photoUrl: z.string().optional()
});

// Helper: check if ATV is booked during date range
export const isAtvBooked = async (
  atvId: string,
  startDate: Date,
  endDate: Date,
  excludeBookingId?: string
): Promise<boolean> => {
  const query: any = {
    atvId,
    status: { $in: ['Pending', 'Pending Signature', 'Customer Signed', 'Upcoming', 'Active'] },
    startDate: { $lte: endDate },
    endDate: { $gte: startDate }
  };

  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }

  const overlappingBooking = await Booking.findOne(query);
  return !!overlappingBooking;
};

export const getAllAtvs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.query;
    const filter: any = {};
    if (status) {
      filter.status = status;
    }

    const atvs = await Atv.find(filter).populate('category').sort({ createdAt: -1 });
    res.status(200).json(atvs);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch ATVs.', error: (error as Error).message });
  }
};

export const getAtvById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const atv = await Atv.findById(id).populate('category');
    if (!atv) {
      res.status(404).json({ message: 'ATV not found.' });
      return;
    }
    res.status(200).json(atv);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch ATV details.', error: (error as Error).message });
  }
};

export const createAtv = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = createAtvSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: 'Invalid ATV inputs.', errors: parsed.error.format() });
      return;
    }

    const newAtv = await Atv.create(parsed.data);

    await logActivity(`Added new ATV (${newAtv.model})`, (req as any).user?.email || 'admin', req.ip || '', 'success');

    res.status(201).json(newAtv);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create ATV.', error: (error as Error).message });
  }
};

export const updateAtv = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const atv = await Atv.findById(id);
    if (!atv) {
      res.status(404).json({ message: 'ATV not found.' });
      return;
    }

    // Direct object update
    const updated = await Atv.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });

    await logActivity(`Updated ATV (${updated?.model})`, (req as any).user?.email || 'admin', req.ip || '', 'info');

    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update ATV.', error: (error as Error).message });
  }
};

export const deleteAtv = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const atv = await Atv.findById(id);
    if (!atv) {
      res.status(404).json({ message: 'ATV not found.' });
      return;
    }

    await Atv.findByIdAndDelete(id);

    await logActivity(`Deleted ATV (${atv.model})`, (req as any).user?.email || 'admin', req.ip || '', 'warning');

    res.status(200).json({ message: 'ATV deleted successfully from fleet.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete ATV.', error: (error as Error).message });
  }
};

export const checkAtvAvailability = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { start, end } = req.query;

    if (!start || !end) {
      res.status(400).json({ message: 'Start and end dates are required queries.' });
      return;
    }

    let startDate: Date;
    let endDate: Date;

    if (typeof start === 'string') {
      const datePart = start.split('T')[0];
      startDate = new Date(`${datePart}T12:00:00-04:00`);
    } else {
      startDate = new Date(start as unknown as string);
    }

    if (typeof end === 'string') {
      const datePart = end.split('T')[0];
      endDate = new Date(`${datePart}T12:00:00-04:00`);
    } else {
      endDate = new Date(end as unknown as string);
    }

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      res.status(400).json({ message: 'Invalid start or end date format.' });
      return;
    }

    const atv = await Atv.findById(id);
    if (!atv) {
      res.status(404).json({ message: 'ATV not found.' });
      return;
    }

    if (atv.status === 'MAINTENANCE' || atv.status === 'DECOMMISSIONED') {
      res.status(200).json({ available: false, reason: `ATV status is currently ${atv.status}` });
      return;
    }

    const booked = await isAtvBooked(id, startDate, endDate);
    res.status(200).json({ available: !booked, reason: booked ? 'ATV has overlapping reservations.' : 'ATV is available.' });
  } catch (error) {
    res.status(500).json({ message: 'Availability check error.', error: (error as Error).message });
  }
};

export const addMaintenance = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const parsed = maintenanceSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: 'Invalid maintenance record inputs.', errors: parsed.error.format() });
      return;
    }

    const atv = await Atv.findById(id);
    if (!atv) {
      res.status(404).json({ message: 'ATV not found.' });
      return;
    }

    atv.maintenanceHistory.push(parsed.data);
    // Automatically transition to AVAILABLE after maintenance complete, if desired, or keep as is
    await atv.save();

    await logActivity(`Added maintenance log for ATV (${atv.model})`, (req as any).user?.email || 'admin', req.ip || '', 'info');

    res.status(200).json({ message: 'Maintenance record logged successfully.', atv });
  } catch (error) {
    res.status(500).json({ message: 'Failed to add maintenance log.', error: (error as Error).message });
  }
};

export const addDamage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const parsed = damageLogSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: 'Invalid damage log inputs.', errors: parsed.error.format() });
      return;
    }

    const atv = await Atv.findById(id);
    if (!atv) {
      res.status(404).json({ message: 'ATV not found.' });
      return;
    }

    atv.damageLogs.push({
      ...parsed.data,
      loggedAt: new Date()
    });
    await atv.save();

    await logActivity(`Added damage log for ATV (${atv.model})`, (req as any).user?.email || 'admin', req.ip || '', 'warning');

    res.status(200).json({ message: 'Damage record logged successfully.', atv });
  } catch (error) {
    res.status(500).json({ message: 'Failed to add damage log.', error: (error as Error).message });
  }
};

export const getAtvBookedDates = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const bookings = await Booking.find({
      atvId: id,
      status: { $in: ['PENDING', 'CONFIRMED', 'CHECKED_OUT'] }
    }).select('startDate endDate');

    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch booked dates.', error: (error as Error).message });
  }
};

