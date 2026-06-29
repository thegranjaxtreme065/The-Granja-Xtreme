import { Router } from 'express';
import {
  createBooking,
  getMyBookings,
  getBookingById,
  getAllBookings,
  signWaiver,
  logInspection,
  updateBookingStatus,
  getWaiverPDF,
  getReceiptPDF,
  collectPayment,
  adminCreateBooking,
  checkinBooking,
  checkoutBooking,
  uploadCustomerSignature,
  uploadAdminSignature,
  createCompleteBooking
} from '../controllers/booking.controller';
import { protect, restrictTo } from '../middleware/auth.middleware';

const router = Router();

router.post('/complete', protect as any, createCompleteBooking as any);
router.post('/', protect as any, createBooking as any);
router.get('/my', protect as any, getMyBookings as any);
router.get('/:id', protect as any, getBookingById as any);
router.post('/:id/waiver', protect as any, signWaiver as any);
router.put('/:id/customer-signature', protect as any, uploadCustomerSignature as any);
router.put('/:id/admin-signature', protect as any, restrictTo('staff', 'admin') as any, uploadAdminSignature as any);
router.get('/:id/waiver/pdf', protect as any, getWaiverPDF as any);
router.get('/:id/receipt/pdf', protect as any, getReceiptPDF as any);

// Admin/Staff endpoints
router.put('/:id/collect-payment', protect as any, restrictTo('staff', 'admin') as any, collectPayment as any);
router.use(protect as any, restrictTo('staff', 'admin') as any);
router.post('/admin-create', adminCreateBooking as any);
router.get('/', getAllBookings as any);
router.post('/:id/inspection', logInspection as any);
router.put('/:id/status', updateBookingStatus as any);
router.post('/:id/checkin', checkinBooking as any);
router.post('/:id/checkout', checkoutBooking as any);

export default router;
