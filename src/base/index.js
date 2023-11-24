import express from 'express';
import { adminRouter } from './admin.js';
import { apiRouter } from './mobile.js';

const restRouter = express.Router();

restRouter.use('/admin', adminRouter);

restRouter.use('/mobile', apiRouter);

export {restRouter}