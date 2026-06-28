import express from 'express';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
} from '../controllers/vehicle_category.controller';
import { protect, restrictTo } from '../middleware/auth.middleware';

const router = express.Router();

router.get('/', getCategories);

router.post('/', protect, restrictTo('admin'), createCategory);
router.put('/:id', protect, restrictTo('admin'), updateCategory);
router.delete('/:id', protect, restrictTo('admin'), deleteCategory);

export default router;
