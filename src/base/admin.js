import express from 'express';
import { userRouter } from '../routes/admin/user.route.js';

export const adminRouter = express.Router();

adminRouter.use('/users', userRouter);

