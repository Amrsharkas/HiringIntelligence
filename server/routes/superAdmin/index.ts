import { Router } from 'express';
import organizationsRoutes from './organizations.routes';
import subscriptionPlansRoutes from './subscriptionPlans.routes';
import creditPackagesRoutes from './creditPackages.routes';
import usersRoutes from './users.routes';
import tutorialSlidesRoutes from './tutorialSlides.routes';
import settingsRoutes from './settings.routes';

const router = Router();

// Mount organization management routes
router.use('/', organizationsRoutes);

// Mount subscription plans management routes
router.use('/', subscriptionPlansRoutes);

// Mount credit packages management routes
router.use('/', creditPackagesRoutes);

// Mount users management routes
router.use('/', usersRoutes);

// Mount tutorial slides management routes
router.use('/', tutorialSlidesRoutes);

// Mount settings management routes
router.use('/', settingsRoutes);

export default router;
