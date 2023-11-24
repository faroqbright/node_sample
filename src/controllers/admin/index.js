import express from 'express';
import { adminRouter } from './admin';
import { apiRouter } from './mobile';

export const restRouter = express.Router();

restRouter.use('/admin', adminRouter);

restRouter.use('/mobile', apiRouter);

