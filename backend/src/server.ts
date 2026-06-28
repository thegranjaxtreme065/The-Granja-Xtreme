import 'dotenv/config'; // Forced restart
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import { connectDB } from './config/db';
import authRoutes from './routes/auth.routes';
import atvRoutes from './routes/atv.routes';
import bookingRoutes from './routes/booking.routes';
import cmsRoutes from './routes/cms.routes';
import settingsRoutes from './routes/settings.routes';
import logsRoutes from './routes/logs.routes';
import contactRoutes from './routes/contact.routes';
import reviewRoutes from './routes/review.routes';
import employeeRoutes from './routes/employee.routes';
import uploadRoutes from './routes/upload.routes';
import analyticsRoutes from './routes/analytics.routes';
import notificationRoutes from './routes/notifications.routes';
import maintenanceRoutes from './routes/maintenance.routes';
import invoiceRoutes from './routes/invoice.routes';
import translationRoutes from './routes/translation.routes';
import accessoryRoutes from './routes/accessory.routes';
import vehicleCategoryRoutes from './routes/vehicle_category.routes';
import { errorHandler } from './middleware/error.middleware';


// Connect to Database
connectDB();

const app = express();

// Security Hardening Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }
}));

// Cors Configuration (Support Credentials for Cookie Sessions)
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'https://thegranjaxtreme.com',
  'https://www.thegranjaxtreme.com'
].filter(Boolean) as string[];

const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Trust proxy is required because Render acts as a reverse proxy, and express-rate-limit 
// needs to know the real client IP (via X-Forwarded-For) instead of the proxy's IP.
app.set('trust proxy', 1);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1500, // Limit each IP to 1500 requests per window (increased for development)
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests from this IP, please try again later.' }
});
app.use('/api', limiter);
app.use(express.json({ limit: '10mb' })); // Support base64 image uploads (e.g. waiver signatures)

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Health Check
app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Root Route
app.get('/', (_req, res) => {
  res.status(200).send('Granja Xtreme API is running! 🚀');
});

// Mount Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/atvs', atvRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/cms', cmsRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/logs', logsRoutes);
app.use('/api/v1/contact', contactRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/employees', employeeRoutes);
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/maintenance', maintenanceRoutes);
app.use('/api/v1/invoices', invoiceRoutes);
app.use('/api/v1/translations', translationRoutes);
app.use('/api/v1/accessories', accessoryRoutes);
app.use('/api/v1/vehicle-categories', vehicleCategoryRoutes);

// Global Error Middleware
app.use(errorHandler as any);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
