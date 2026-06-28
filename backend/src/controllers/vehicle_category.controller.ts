import { Request, Response } from 'express';
import { z } from 'zod';
import { VehicleCategory } from '../models/vehicle_category.model';

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  nameEs: z.string().optional()
});

export const getCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = await VehicleCategory.find().sort({ name: 1 });
    res.json(categories);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching categories', error: error.message });
  }
};

export const createCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, nameEs } = categorySchema.parse(req.body);
    const existing = await VehicleCategory.findOne({ name });
    if (existing) {
      res.status(400).json({ message: 'Category already exists' });
      return;
    }
    const category = new VehicleCategory({ name, nameEs });
    await category.save();
    res.status(201).json(category);
  } catch (error: any) {
    res.status(400).json({ message: 'Error creating category', error: error.message });
  }
};

export const updateCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, nameEs } = categorySchema.parse(req.body);
    const category = await VehicleCategory.findById(req.params.id);
    if (!category) {
      res.status(404).json({ message: 'Category not found' });
      return;
    }
    
    category.name = name;
    if (nameEs !== undefined) {
      category.nameEs = nameEs;
    } else {
      category.nameEs = undefined; 
    }
    
    await category.save();
    res.json(category);
  } catch (error: any) {
    res.status(400).json({ message: 'Error updating category', error: error.message });
  }
};

export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const category = await VehicleCategory.findByIdAndDelete(req.params.id);
    if (!category) {
      res.status(404).json({ message: 'Category not found' });
      return;
    }
    // Note: We might want to check if any ATVs are using this category before deleting.
    // For now, we just delete.
    res.status(200).json({ message: 'Category deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting category', error: error.message });
  }
};
