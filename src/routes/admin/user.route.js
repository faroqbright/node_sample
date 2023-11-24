import express from 'express';
import userController from '../../controllers/admin/user.controller.js';
import passport from 'passport';

export const userRouter = express.Router();
userRouter.get('/test', userController.test);
userRouter.get('/loaduser', userController.loaduser);
userRouter.post('/login', userController.login);
userRouter.post('/forgotPassword', userController.forgotPassword);
userRouter.post('/passwordReset', userController.passwordReset);
userRouter.post('/verifyOTP', userController.verifyOTP);
userRouter.post('/editProfile', userController.editProfile);
userRouter.post('/registerClient', userController.registerClient);
userRouter.post('/registerClientAdmin', userController.registerClientAdmin);
userRouter.post('/setupClientParameters', userController.setupClientParameters);
userRouter.post('/registerSupervisorTeler', userController.registerSupervisorTeler);
userRouter.post('/registerCustomer', userController.registerCustomer);
userRouter.post('/generateQrBatch', userController.generateQrBatch);
userRouter.post('/getQrBatches', userController.getQrBatches);
userRouter.post('/qrPrinted', userController.qrPrinted);
userRouter.post('/disableCompany', userController.disableCompany);
userRouter.post('/editCustomerCreds', userController.editCustomerCreds);
userRouter.get('/loadClientList', userController.loadClientList);
userRouter.get('/loadCustomerList', userController.loadCustomerList);
// userRouter.post('/verifyToken', userController.verifyToken);
userRouter.get('/getLoginUserProfile', passport.authenticate('jwt', { session: false, failureRedirect: '/failure' }), userController.getLoginUserProfile);

userRouter.get('/listing', passport.authenticate('jwt', { session: false, failureRedirect: '/failure' }), userController.listing);
// userRouter.get('/test', userController.test);
userRouter.post('/add', passport.authenticate('jwt', { session: false, failureRedirect: '/failure' }), userController.add);
userRouter.post('/update/:id', passport.authenticate('jwt', { session: false, failureRedirect: '/failure' }), userController.update);
userRouter.get('/detail/:id', passport.authenticate('jwt', { session: false, failureRedirect: '/failure' }), userController.detail);
userRouter.delete('/delete/:id', passport.authenticate('jwt', { session: false, failureRedirect: '/failure' }), userController.delete);

// REPORTS
userRouter.post('/TotalDepositsReportCompany', userController.TotalDepositsReportCompany);
userRouter.post('/TotalDepositsReportLocalCompany', userController.TotalDepositsReportLocalCompany);
userRouter.post('/TotalDepositsReportLocalTeller', userController.TotalDepositsReportLocalTeller);
userRouter.post('/TotalDepositsReportFXTeller', userController.TotalDepositsReportFXTeller);
userRouter.post('/TotalDepositsReportChecksTeller', userController.TotalDepositsReportChecksTeller);
userRouter.post('/TotalDepositsReportFXCompany', userController.TotalDepositsReportFXCompany);
userRouter.post('/TotalDepositsReportChecksCompany', userController.TotalDepositsReportChecksCompany);
userRouter.post('/TotalDepositsReportTeller', userController.TotalDepositsReportTeller);
userRouter.post('/TotalCustomersReportCompany', userController.TotalCustomersReportCompany);
userRouter.post('/TotalQRGeneratedReportCompany', userController.TotalQRGeneratedReportCompany);
userRouter.post('/ToatalDepositedPerCustomerReportCompany', userController.ToatalDepositedPerCustomerReportCompany);
userRouter.post('/TotalBagsProcessedPerCustomerReportCompany', userController.TotalBagsProcessedPerCustomerReportCompany);
userRouter.post('/TotalBagsProcessedReportCompany', userController.TotalBagsProcessedReportCompany);
userRouter.post('/TotalBagsProcessedReportTeller', userController.TotalBagsProcessedReportTeller);







