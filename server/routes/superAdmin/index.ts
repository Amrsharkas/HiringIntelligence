import { Router } from 'express';
import organizationsRoutes from './organizations.routes';
import subscriptionPlansRoutes from './subscriptionPlans.routes';
import creditPackagesRoutes from './creditPackages.routes';
import promptsRoutes from './prompts.routes';

const router = Router();

// Mount organization management routes
router.use('/', organizationsRoutes);

// Mount subscription plans management routes
router.use('/', subscriptionPlansRoutes);

// Mount credit packages management routes
router.use('/', creditPackagesRoutes);

// Mount prompts management routes
router.use('/', promptsRoutes);

export default router;
