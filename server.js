const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const sequelize = require('./src/config/database');
const { PartnerTier } = require('./src/models');
const { User } = require('./src/models');

// Middleware
const errorHandler = require('./src/middleware/errorHandler');
const { errorResponse } = require('./src/middleware/responseFormatter');

// Routes
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const planRoutes = require('./src/routes/planRoutes');
const offerRoutes = require('./src/routes/offerRoutes');
const referralRoutes = require('./src/routes/referralRoutes');
const fileRoutes = require('./src/routes/fileRoutes');
const balanceSheetRoutes = require('./src/routes/balanceSheetRoutes');
const ticketRoutes = require('./src/routes/ticketRoutes');
const investmentRoutes = require('./src/routes/investmentRoutes');
const documentRoutes = require('./src/routes/DocumentRoute');
const nomineeRoutes = require('./src/routes/NomineeRoute');
const partnerCommissionRoutes = require('./src/routes/PartnerCommissionRoute');
const partnerTierRoutes = require('./src/routes/PartnerTierRoutes');
const returnRoutes = require('./src/routes/ReturnRoutes');
const userPointRoutes = require('./src/routes/UserPointRoute');
const bankDetailRoutes = require('./src/routes/BankDetailRoute');

const { initializeScheduler } = require('./src/utils/scheduler');

const app = express();
app.set('trust proxy', 1);

const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

/* ===========================================================
   Security
=========================================================== */

const allowedOrigins =
    process.env.NODE_ENV === 'production'
        ? ['https://yourdomain.com']
        : ['http://localhost:3000', 'http://localhost:5173'];

app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

app.use(
    helmet({
        crossOriginResourcePolicy: {
            policy: 'cross-origin'
        }
    })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many requests. Please try again later.'
    }
});

app.use('/api', limiter);

/* ===========================================================
   Static Files
=========================================================== */

app.use(
    '/uploads',
    express.static(path.join(__dirname, 'uploads'))
);

app.use((req, res, next) => {
    res.locals.baseUrl = BASE_URL;
    next();
});

/* ===========================================================
   Logger
=========================================================== */

app.use((req, res, next) => {
    console.log(
        `${new Date().toISOString()} | ${req.method} ${req.originalUrl}`
    );
    next();
});

/* ===========================================================
   Health
=========================================================== */

app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'API Running'
    });
});

app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server Running',
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
    });
});

/* ===========================================================
   API Routes
=========================================================== */

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/balance-sheets', balanceSheetRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/investments', investmentRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/nominees', nomineeRoutes);
app.use('/api/partner-commissions', partnerCommissionRoutes);
app.use('/api/partner-tiers', partnerTierRoutes);
app.use('/api/returns', returnRoutes);
app.use('/api/user-points', userPointRoutes);
app.use('/api/bank-details', bankDetailRoutes);

/* ===========================================================
   404
=========================================================== */

app.use((req, res) => {
    return errorResponse(
        res,
        `Route ${req.originalUrl} not found`,
        404
    );
});

/* ===========================================================
   Error Handler
=========================================================== */

app.use(errorHandler);

/* ===========================================================
   Admin Seeder
=========================================================== */

async function createAdminIfNotExists() {
    try {

        const email = process.env.ADMIN_EMAIL || 'admin@kkinsure.com';

        const admin = await User.findOne({
            where: {
                email,
                role: 'admin'
            }
        });

        if (admin) {
            console.log('✅ Admin already exists');
            return;
        }

        await User.create({
            email,
            password: process.env.ADMIN_PASSWORD || 'Admin@123',
            fullName: process.env.ADMIN_NAME || 'Chief Administrator',
            role: 'admin',
            partnerType: 'none',
            isActive: true
        });

        console.log('✅ Admin created');
    } catch (err) {
        console.error('Admin Seeder Error:', err);
    }
}
/* ===========================================================
   Parner Seeder
=========================================================== */

// src/utils/seedPartnerTiers.js

async function seedPartnerTiers() {
  try {
    const count = await PartnerTier.count();
    if (count > 0) {
      console.log('✅ Partner tiers already exist');
      return;
    }

    await PartnerTier.bulkCreate([
      {
        name: 'referral',
        minInvestment: 100000,
        maxInvestment: 1000000,
        commissionRate: 1.0,
        isActive: true,
      },
      {
        name: 'authorised',
        minInvestment: 100000,
        maxInvestment: 1000000,
        commissionRate: 1.5,
        isActive: true,
      },
      {
        name: 'hni',
        minInvestment: 100000,
        maxInvestment: 1000000,
        commissionRate: 2.5,
        isActive: true,
      },
    ]);

    console.log('✅ Partner tiers seeded successfully');
  } catch (error) {
    console.error('Partner Tier Seeder Error:', error);
  }
}

module.exports = seedPartnerTiers;
/* ===========================================================
   Start Server
=========================================================== */

async function startServer() {
    try {
        await sequelize.authenticate();
        console.log('✅ Database Connected');

        require('./src/models');

        await sequelize.sync({
            alter: process.env.NODE_ENV !== 'production'
        });

        console.log('✅ Database Synced');

        await createAdminIfNotExists();
        await seedPartnerTiers();

        app.listen(PORT, () => {
            console.log('=================================');
            console.log(`🚀 Server Started`);
            console.log(`🌐 ${BASE_URL}`);
            console.log(`📦 Port : ${PORT}`);
            console.log(`🌍 ${process.env.NODE_ENV}`);
            console.log('=================================');
        });

        // if (
        //     process.env.NODE_ENV !== 'test' &&
        //     typeof initializeScheduler === 'function'
        // ) {
        //     initializeScheduler();
        //     console.log('✅ Scheduler Started');
        // }

    } catch (err) {
        console.error('❌ Server Startup Failed');
        console.error(err);
        process.exit(1);
    }
}

    startServer();

module.exports = {
    app,
    startServer
};