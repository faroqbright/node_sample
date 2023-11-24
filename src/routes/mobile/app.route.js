import express from 'express';
import appController from '../../controllers/mobile/app.controller';
import passport from 'passport';
import upload from "../../libraries/multer";

export const appRouter = express.Router();


appRouter.get('/testLink', appController.testLink);
// appRouter.get('/testLink2', appController.testLink2);
appRouter.get('/loaduser', appController.loaduser);
appRouter.post('/forgotPassword', appController.forgotPassword);


appRouter.post('/login', appController.loginApp);
appRouter.post('/customerScanQR', appController.customerScanQR);
appRouter.post('/customerDepositRequest', appController.customerDepositRequest);
appRouter.post('/TellerCheckRequest', appController.TellerCheckRequest);
appRouter.post('/editProfile', appController.editProfile);
appRouter.post('/changePassword', appController.changePassword);
appRouter.post('/bagRequest', appController.bagRequest);
appRouter.post('/addNotification', appController.addNotification);
appRouter.post('/storeFcm', appController.storeFcm);
// Reports 

// Total Deposits
appRouter.post('/TotalDepositsReportCompany', appController.TotalDepositsReportCompany);
appRouter.post('/TotalDepositsReportTeller', appController.TotalDepositsReportTeller);
appRouter.post('/TotalDepositsReportCustomer', appController.TotalDepositsReportCustomer);
// 
appRouter.post('/TotalCustomersReportCompany', appController.TotalCustomersReportCompany);
appRouter.post('/TotalQRGeneratedReport', appController.TotalQRGeneratedReport);
appRouter.post('/TotalQRGeneratedReportCompany', appController.TotalQRGeneratedReportCompany);
appRouter.post('/ToatalDepositedPerCustomerReportCompany', appController.ToatalDepositedPerCustomerReportCompany);
appRouter.post('/TotalBagsProcessedPerCustomerReportCompany', appController.TotalBagsProcessedPerCustomerReportCompany);
appRouter.post('/TotalBagsProcessedReportCompany', appController.TotalBagsProcessedReportCompany);
appRouter.post('/TotalBagsProcessedReportTeller', appController.TotalBagsProcessedReportTeller);

appRouter.post('/TotalDepositsReportLocalCompany', appController.TotalDepositsReportLocalCompany);
appRouter.post('/TotalDepositsReportFXCompany', appController.TotalDepositsReportFXCompany);
appRouter.post('/TotalDepositsReportChecksCompany', appController.TotalDepositsReportChecksCompany);
appRouter.post('/TotalDepositsReportLocalTeller', appController.TotalDepositsReportLocalTeller);
appRouter.post('/TotalDepositsReportFXTeller', appController.TotalDepositsReportFXTeller);
appRouter.post('/TotalDepositsReportChecksTeller', appController.TotalDepositsReportChecksTeller);
appRouter.post('/TotalDepositsReportLocalCustomer', appController.TotalDepositsReportLocalCustomer);
appRouter.post('/TotalDepositsReportFXCustomer', appController.TotalDepositsReportFXCustomer);
appRouter.post('/TotalDepositsReportChecksCustomer', appController.TotalDepositsReportChecksCustomer);

appRouter.get('/listOfNotifications', appController.listOfNotifications);
appRouter.get('/changeNotificationStatus/:id', appController.changeNotificationStatus);
appRouter.get('/changeBagRequestStatus/:id', appController.changeBagRequestStatus);
appRouter.get('/loadCustomerHomePage', appController.loadCustomerHomePage);
appRouter.get('/loadTellerHomePage', appController.loadTellerHomePage);
// appRouter.get('/loadSupervisorHomePage', appController.loadSupervisorHomePage);

appRouter.delete('/removeNotification/:id', appController.removeNotification);
// appRouter.post('/checkEmail', appController.checkEmail);
// appRouter.post('/verifyOTP', appController.verifyOTP);
// appRouter.post('/resendVerifyOTP', appController.resendVerifyOTP);
// appRouter.post('/contactUs', appController.contactUs);
// appRouter.post('/logout', appController.logout);
// appRouter.get('/getLoginUserProfile', passport.authenticate('jwt', { session: false, failureRedirect: '/failure' }), appController.getLoginUserProfile);
// appRouter.put('/changePassword/:id', passport.authenticate('jwt', { session: false, failureRedirect: '/failure' }), appController.changePassword);
// appRouter.put('/updatePhoneNumber/:id', passport.authenticate('jwt', { session: false, failureRedirect: '/failure' }), appController.updatePhoneNumber);
// appRouter.put('/updateAccountDetail/:id', passport.authenticate('jwt', { session: false, failureRedirect: '/failure' }), appController.updateAccountDetail);
// appRouter.put('/updateLocation/:id', passport.authenticate('jwt', { session: false, failureRedirect: '/failure' }), appController.updateLocation);
// appRouter.delete('/deleteAccount/:id', passport.authenticate('jwt', { session: false, failureRedirect: '/failure' }), appController.deleteAccount);
// appRouter.get('/getAllServices', passport.authenticate('jwt', { session: false, failureRedirect: '/failure' }), appController.getAllServices);
// appRouter.get('/createCart', passport.authenticate('jwt', { session: false, failureRedirect: '/failure' }), appController.createCart);

// appRouter.get('/listing', passport.authenticate('jwt', { session: false, failureRedirect: '/failure' }), appController.listing);
// appRouter.post('/add', upload.any(), passport.authenticate('jwt', { session: false, failureRedirect: '/failure' }), appController.add);
// appRouter.post('/update/:id',upload.any(), passport.authenticate('jwt', { session: false, failureRedirect: '/failure' }), appController.update);
// appRouter.get('/detail/:id', passport.authenticate('jwt', { session: false, failureRedirect: '/failure' }), appController.detail);
// appRouter.delete('/delete/:id', passport.authenticate('jwt', { session: false, failureRedirect: '/failure' }), appController.delete);

//Customer Side Apis
// appRouter.post('/placeOrder', upload.any(), passport.authenticate('jwt', { session: false, failureRedirect: '/failure' }), appController.placeOrder);
// appRouter.get('/dashboard', passport.authenticate('jwt', { session: false, failureRedirect: '/failure' }), appController.dashboard);
// appRouter.get('/listOfProjects', passport.authenticate('jwt', { session: false, failureRedirect: '/failure' }), appController.listOfProjects);
// appRouter.get('/orderDetail/:id', passport.authenticate('jwt', { session: false, failureRedirect: '/failure' }), appController.orderDetail);

//Contractor Side Apis
// appRouter.get('/listOfCompanies', passport.authenticate('jwt', { session: false, failureRedirect: '/failure' }), appController.listOfCompanies);
// appRouter.get('/contractorDashboard', passport.authenticate('jwt', { session: false, failureRedirect: '/failure' }), appController.contractorDashboard);
// appRouter.get('/listOfActiveContractorProjects', passport.authenticate('jwt', { session: false, failureRedirect: '/failure' }), appController.listOfActiveContractorProjects);
// appRouter.get('/listOfAvailableContractorProjects', passport.authenticate('jwt', { session: false, failureRedirect: '/failure' }), appController.listOfAvailableContractorProjects);
// appRouter.get('/listOfCompletedContractorProjects', passport.authenticate('jwt', { session: false, failureRedirect: '/failure' }), appController.listOfCompletedContractorProjects);
// appRouter.post('/changeProjectRequestStatus/:id', passport.authenticate('jwt', { session: false, failureRedirect: '/failure' }), appController.changeProjectRequestStatus);
// appRouter.post('/changeProjectOrderStatus/:id', passport.authenticate('jwt', { session: false, failureRedirect: '/failure' }), appController.changeProjectOrderStatus);
// appRouter.get('/listOfStaff/:id', passport.authenticate('jwt', { session: false, failureRedirect: '/failure' }), appController.listOfStaff);
// appRouter.get('/listOfScheduledContractorProjects', passport.authenticate('jwt', { session: false, failureRedirect: '/failure' }), appController.listOfScheduledContractorProjects);




// appRouter.get('/listOfNotifications', passport.authenticate('jwt', { session: false, failureRedirect: '/failure' }), appController.listOfNotifications);
// appRouter.get('/notificationDetail/:id', passport.authenticate('jwt', { session: false, failureRedirect: '/failure' }), appController.notificationDetail);

// appRouter.post('/assignProjectToUser', passport.authenticate('jwt', { session: false, failureRedirect: '/failure' }), appController.assignProjectToUser);
// appRouter.get('/listOfContractors', passport.authenticate('jwt', { session: false, failureRedirect: '/failure' }), appController.listOfContractors);

// appRouter.post('/addCustomerStripeCard', passport.authenticate('jwt', { session: false, failureRedirect: '/failure' }), appController.addCustomerStripeCard);
// appRouter.get('/listOfCustomerStripeCards', passport.authenticate('jwt', { session: false, failureRedirect: '/failure' }), appController.listOfCustomerStripeCards);
// appRouter.get('/customerStripeCardDetail/:id', passport.authenticate('jwt', { session: false, failureRedirect: '/failure' }), appController.customerStripeCardDetail);

// appRouter.get('/getUserAllStatusBit/:id', passport.authenticate('jwt', { session: false, failureRedirect: '/failure' }), appController.getUserAllStatusBit);
// appRouter.put('/updateUserStatusBit/:id', passport.authenticate('jwt', { session: false, failureRedirect: '/failure' }), appController.updateUserStatusBit);

// appRouter.put('/updateStaff/:id',upload.any(), passport.authenticate('jwt', { session: false, failureRedirect: '/failure' }), appController.updateStaff);
// appRouter.get('/listofTransactions', passport.authenticate('jwt', { session: false, failureRedirect: '/failure' }), appController.listofTransactions);
