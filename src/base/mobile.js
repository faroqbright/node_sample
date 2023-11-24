import express from 'express';
import { appRouter } from '../routes/mobile/app.route.js';

export const apiRouter = express.Router();

apiRouter.use('/api', appRouter);



