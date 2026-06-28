import { Schema, model } from 'mongoose';

export interface IDamageLog {
  part: string;
  description: string;
  photoUrl?: string;
  loggedAt: Date;
}

export interface IMaintenanceHistory {
  serviceType: string;
  description: string;
  cost: number;
  completedAt: Date;
  mileageAtService?: number;
}

export interface ISpecs {
  displacement: string;
  fuelCapacity: string;
  weightLimit: string;
}

export interface IAtv {
  name: string;
  nameEs?: string;
  model: string;
  category?: Schema.Types.ObjectId | any; // To allow populate
  year: number;
  status: 'AVAILABLE' | 'RENTED' | 'MAINTENANCE' | 'DECOMMISSIONED';
  ratePerDay: number;
  hourlyRate: number;
  description: string;
  descriptionEs?: string;
  specs: ISpecs;
  images: string[];
  damageLogs: IDamageLog[];
  maintenanceHistory: IMaintenanceHistory[];
  currentOdometer: number;
  currentFuelLevel: number;
  createdAt: Date;
  updatedAt: Date;
}

const damageLogSchema = new Schema<IDamageLog>({
  part: { type: String, required: true },
  description: { type: String, required: true },
  photoUrl: { type: String },
  loggedAt: { type: Date, default: Date.now }
});

const maintenanceHistorySchema = new Schema<IMaintenanceHistory>({
  serviceType: { type: String, required: true },
  description: { type: String, required: true },
  cost: { type: Number, required: true },
  completedAt: { type: Date, required: true },
  mileageAtService: { type: Number }
});

const specsSchema = new Schema<ISpecs>({
  displacement: { type: String, required: true },
  fuelCapacity: { type: String, required: true },
  weightLimit: { type: String, required: true }
});

const atvSchema = new Schema<IAtv>(
  {
    name: { type: String, required: true, trim: true },
    nameEs: { type: String },
    model: { type: String, required: true, trim: true },
    category: { type: Schema.Types.ObjectId, ref: 'VehicleCategory' },
    year: { type: Number, required: true },
    status: {
      type: String,
      enum: ['AVAILABLE', 'RENTED', 'MAINTENANCE', 'DECOMMISSIONED'],
      default: 'AVAILABLE'
    },
    ratePerDay: { type: Number, required: true },
    hourlyRate: { type: Number, required: true },
    description: { type: String, required: true },
    descriptionEs: { type: String },
    specs: { type: specsSchema, required: true },
    images: [{ type: String }],
    damageLogs: [damageLogSchema],
    maintenanceHistory: [maintenanceHistorySchema],
    currentOdometer: { type: Number, default: 0 },
    currentFuelLevel: { type: Number, default: 100 }
  },
  {
    timestamps: true
  }
);

import { translateText } from '../services/translation.service';

atvSchema.post('save', function(doc) {
  // Pre-warm the translation cache
  if (doc.description) translateText(doc.description, 'es', 'dynamic').catch(err => console.error(err));
  if (doc.name) translateText(doc.name, 'es', 'dynamic').catch(err => console.error(err));
});

export const Atv = model<IAtv>('Atv', atvSchema);
