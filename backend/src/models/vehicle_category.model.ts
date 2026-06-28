import { Schema, model } from 'mongoose';
import { translateText } from '../services/translation.service';

export interface IVehicleCategory {
  name: string;
  nameEs?: string;
  createdAt: Date;
  updatedAt: Date;
}

const vehicleCategorySchema = new Schema<IVehicleCategory>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    nameEs: { type: String, trim: true }
  },
  { timestamps: true }
);

vehicleCategorySchema.post('save', function(doc) {
  // Auto-translate if name is present
  if (doc.name && !doc.nameEs) {
    translateText(doc.name, 'es', 'dynamic').catch(err => console.error('Error auto-translating category:', err));
  }
});

export const VehicleCategory = model<IVehicleCategory>('VehicleCategory', vehicleCategorySchema);
