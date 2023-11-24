import { BAD_REQUEST, INTERNAL_SERVER_ERROR, UNAUTHORIZED, OK, NOT_FOUND } from "http-status-codes";
import bcryptjs from 'bcryptjs';
import userService from "../../services/user.service.js";
import staffService from "../../services/staff.service.js";
import mobileService from "../../services/mobile.service.js";
// import UserModel from "../../models/user.model";
import { getJWTToken, randomValueHex, getEncryptedPassword, decode, sendNotification } from '../../libraries/util';
import { makeApiResponce } from '../../libraries/responce';
import { sendEmail } from "../../libraries/mail";
import NotificationModel from "../../models/notification.model";
import crudService from "../../services/crud.service.js";
var pdf = require('html-pdf');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
// import ServiceModel from "../../models/service.model";
// import PropertyModel from "../../models/property.model";
// import OrderModel from "../../models/order.model";
// import OrderDetailModel from "../../models/orderDetail.model";
// import CompanyModel from "../../models/company.model";
// import OrderAcceptedModel from "../../models/orderAccepted.model";
// import StaffModel from "../../models/staff.model";
// import mongoose from 'mongoose';
// import NotificationModel from "../../models/notification.model";
// import AssignedOrderModel from "../../models/assignedOrder.model";
// import UserStripeCardModel from "../../models/userStripeCard.model";
// import fcmNode from "fcm-node";
import staffModel from "../../models/staff.model";
import companyModel from "../../models/company.model";
import qrSingleMdel from "../../models/qrSingle.mdel.js";
import mongoose from "mongoose";
import bagRequestModel from "../../models/bagRequest.model.js";
const basr_url = 'http://35.182.155.247'

// Setup Stripe
export default {
    async changePassword(req, res) {
        try {
            const { oldPassword, newPassword, confirmPassword } = req.body
            const decoded_id = await decode(req.query.x_auth);
            const findUser = await staffModel.findById(decoded_id);
            if (!findUser) {
                let result = makeApiResponce('Unauthorized Attempt', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            // const { error, value } = userService.validateChangePasswordSchema(req.body);
            // if (error && error.details) {
            //     let result = makeApiResponce(error.message, 0, BAD_REQUEST, error.message)
            //     return res.status(BAD_REQUEST).json(result);
            // }
            if (!oldPassword) {
                let result = makeApiResponce('Old password is required', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            if (!newPassword) {
                let result = makeApiResponce('New password is required', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            if (!confirmPassword) {
                let result = makeApiResponce('Confirm password is required', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            const matched = await bcryptjs.compare(oldPassword, findUser.password)
            if (!matched) {
                let result = makeApiResponce('Incorrect old password', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            if (newPassword !== confirmPassword) {
                let result = makeApiResponce('Password match failed', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            if (!(/^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])[0-9a-zA-Z!@#$%^&*]*$/).test(newPassword)) {
                let result = makeApiResponce('Password should be like JohnDev123#', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            if (!(/^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])[0-9a-zA-Z!@#$%^&*]*$/).test(confirmPassword)) {
                let result = makeApiResponce('Password should be like JohnDev123#', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            const hash = await getEncryptedPassword(newPassword);
            findUser.password = hash;
            await findUser.save()
            let userResponce = {}
            let result = makeApiResponce('Password changed', 1, OK, userResponce);
            return res.json(result);
        } catch (err) {
            console.log(err);
            let result = makeApiResponce('INTERNAL_SERVER_ERROR', 0, INTERNAL_SERVER_ERROR, err.message);
            return res.status(INTERNAL_SERVER_ERROR).json(result)
        }
    },
    async loginApp(req, res) {
        try {
            // VALIDATE THE REQUEST
            const { error, value } = userService.validateLoginSchema(req.body);
            if (error && error.details) {
                let result = makeApiResponce(error.message, 0, BAD_REQUEST, error.message)
                return res.status(BAD_REQUEST).json(result);
            }
            // FETCH THE USER
            const userQuery = { email: req.body.email };
            let user = await staffModel.findOne(userQuery);
            if (!user) {
                let result = makeApiResponce('Please check your email and password, then try again', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            let company = await companyModel.findById(user.company)
            if (company.companyStatus === "disabled") {
                let result = makeApiResponce('Company assigned against this user is currently disabled', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            if (user.accountType === "superadmin" || user.accountType === "admin") {
                let result = makeApiResponce('Superadmin or admin are not allowed to login', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            const matched = await bcryptjs.compare(req.body.password, user.password)
            if (!matched) {
                let result = makeApiResponce('invalid Credential', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }

            const token = await getJWTToken({ id: user._id });
            let userResponce;
            userResponce = {
                userData: user,
                company,
                token: token
            }

            // const findUser = await staffModel.findById(user._id);
            // findUser.fcmToken = req.body.fcmToken;
            // await findUser.save();

            // FCM.push_notification("Fundraiser goal", `Congratulations!.`, req.body.fcmToken, 12);

            // let Noti = new Notification({
            //     receiverId: Found.userId._id,
            //     notificationText: `Congratulations! ${Found.title} has reached ${avg}% of its goal.`,
            //     module_id: 'Charity',
            //     module_value: charityPayment._id
            //   });
            //   await Noti.save();
            let result = makeApiResponce('LoggedIn Successfully', 1, OK, userResponce);
            return res.json(result);

        } catch (err) {
            console.log(err);
            let result = makeApiResponce('INTERNAL_SERVER_ERROR', 0, INTERNAL_SERVER_ERROR, err.message);
            return res.status(INTERNAL_SERVER_ERROR).json(result)
        }
    },
    async testLink(req, res) {
        try {
            // await sendNotification(
            //     "dcerFSEwRgmVZFCUO5TFXM:APA91bFBHAOv8K-Q8TqTpKKqKvXFJoXbShoVXuRNBVj6LfEx8v7_3u1MtPBBVf-7N4ueFJMTk5ih74tm8Y7HrxsyYmcgiDt-TquIiPvCH4KvpOIhp7EflLsOc70J5jaywWtAW8FD-5Kq",
            //     {
            //         title: "⏰ Title!!!",
            //         body: "This is my body.",
            //     }
            // );
            return res.status(200).json({ "connection": 'success', token: req.headers.x_auth });
        } catch (error) {
            console.log(error)
            let result = makeApiResponce('INTERNAL_SERVER_ERROR', 0, INTERNAL_SERVER_ERROR, error);
            return res.status(INTERNAL_SERVER_ERROR).json(result)
        }
    },
    async testLink2(req, res) {
        try {
            // await sendNotification(
            //     "dcerFSEwRgmVZFCUO5TFXM:APA91bFBHAOv8K-Q8TqTpKKqKvXFJoXbShoVXuRNBVj6LfEx8v7_3u1MtPBBVf-7N4ueFJMTk5ih74tm8Y7HrxsyYmcgiDt-TquIiPvCH4KvpOIhp7EflLsOc70J5jaywWtAW8FD-5Kq",
            //     {
            //         title: "⏰ Title!!!",
            //         body: "This is my body.",
            //     }
            // );
            return res.status(200).json({ "connection": 'success', token: req.headers.x_auth });
        } catch (error) {
            console.log(error)
            let result = makeApiResponce('INTERNAL_SERVER_ERROR', 0, INTERNAL_SERVER_ERROR, error);
            return res.status(INTERNAL_SERVER_ERROR).json(result)
        }
    },
    async forgotPassword(req, res) {
        try {
            const randomForgotOTP = await randomValueHex("6");
            const findUser = await staffModel.findOne({ email: req.body.email });
            if (!findUser) {
                let result = makeApiResponce('Not a registered email.', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            // UPDATE THE USER
            const hash = await getEncryptedPassword(randomForgotOTP);
            findUser.password = hash;
            findUser.otp = randomForgotOTP;
            await findUser.save();

            const passwordLink = `
            <p>Here is your new password <span style="font-weight:bold">${randomForgotOTP}</span></a></p>`;
            // node mailer
            await sendEmail({
                html: passwordLink,
                subject: "Forgot Password",
                email: req.body.email,
            });

            let userResponce = {};
            let result = makeApiResponce('Updated password sent to your email address', 1, OK, userResponce);
            return res.json(result);

        } catch (err) {
            console.log(err);
            let result = makeApiResponce('INTERNAL_SERVER_ERROR', 0, INTERNAL_SERVER_ERROR);
            return res.status(INTERNAL_SERVER_ERROR).json(result)
        }
    },

    async loaduser(req, res) {
        try {
            // const user = req.user;
            const token = req.query.x_auth;
            if (token) {
                const decoded = await decode(token);
                const user = await staffModel.findById(decoded)
                let company
                if (user.company) {
                    company = await companyModel.findById(user.company)
                    if (company.companyStatus === "disabled") {
                        let result = makeApiResponce('Company assigned against this user is currently disabled', 1, BAD_REQUEST)
                        return res.status(BAD_REQUEST).json(result);
                    }
                }
                let userResponce;
                userResponce = {
                    userData: user,
                    company,
                    token
                }
                let result = makeApiResponce('User Loaded', 1, OK, userResponce);
                return res.json(result);
            } else {
                res.status(400).json({ message: 'Invalid Token' })
            }
            // if (user) {
            //     return res.status(200).json({ success: true, data: user, token });
            // }

            // return res.status(400).json({ success: false, message: "Invalid Attempt" });
        } catch (error) {
            return res.status(404).json({ success: false, message: error.message });
        }
    },

    async customerScanQR(req, res) {
        try {
            const decoded_id = await decode(req.query.x_auth);
            const findUser = await staffModel.findById(decoded_id);
            if (!findUser) {
                let result = makeApiResponce('Unauthorized Attempt', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            if (req.body.clientID != findUser.company) {
                let result = makeApiResponce('This QR Code does not belongs to your bank', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            const qrsingle = await qrSingleMdel.findOne({ bagID: req.body.bagID })
            if (!qrsingle) {
                let result = makeApiResponce('Bag id is invalid', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            if (qrsingle.customerID != req.body.customerID) {
                let result = makeApiResponce('This QR code is not for you xD', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            const company = await companyModel.findById(qrsingle.clientID, { companyName: 1 })
            if (findUser.accountType === "customer") {
                if (findUser._id != req.body.customerID) {
                    let result = makeApiResponce('This QR code is not for you', 1, BAD_REQUEST)
                    return res.status(BAD_REQUEST).json(result);
                }
                if (qrsingle.ScannedByCustomer) {
                    let result = makeApiResponce('QR Code is expired', 1, BAD_REQUEST)
                    return res.status(BAD_REQUEST).json(result);
                }
                let userResponce = { accoutType: "customer", qrsingle, company }
                let result = makeApiResponce('proceed', 1, OK, userResponce);
                return res.json(result);
            }
            if (findUser.accountType === "teller") {
                if (qrsingle.ScannedByTeller) {
                    let result = makeApiResponce('QR Code is expired', 1, BAD_REQUEST)
                    return res.status(BAD_REQUEST).json(result);
                }
                if (qrsingle.ScannedByCustomer === false) {
                    let result = makeApiResponce('QR Code needs to be scanned by customer first', 1, BAD_REQUEST)
                    return res.status(BAD_REQUEST).json(result);
                }
                const customer = await staffModel.findById(qrsingle.customerID);
                let userResponce = { accoutType: "teller", qrsingle, company, customer }
                let result = makeApiResponce('proceed', 1, OK, userResponce);
                return res.json(result);
            } else {
                if (qrsingle.ScannedByTeller) {
                    let result = makeApiResponce('QR Code is expired', 1, BAD_REQUEST)
                    return res.status(BAD_REQUEST).json(result);
                }
                if (qrsingle.ScannedByCustomer === false) {
                    let result = makeApiResponce('QR Code needs to be scanned by customer first', 1, BAD_REQUEST)
                    return res.status(BAD_REQUEST).json(result);
                }
                const customer = await staffModel.findById(qrsingle.customerID);
                let userResponce = { accountType: "supervisor", qrsingle, company, customer }
                let result = makeApiResponce('proceed', 1, OK, userResponce);
                return res.json(result);
            }

            // if(scanner.accountType === "customer"){
            //     await qrSingleMdel.findOneAndUpdate({bagID: req.body.bagID},{ScannedByCustomer:true})
            //     let userResponce = {
            //         scan : "success",scannedBy:`${scanner.accountType}`
            //     }
            //     let result = makeApiResponce('QR scan success', 1, OK, userResponce);
            //     return res.json(result);
            // } else {
            //     await qrSingleMdel.findOneAndUpdate({bagID: req.body.bagID},{ScannedByTeller:true})
            //     let userResponce = {
            //         scan : "success",scannedBy:`${scanner.accountType}`
            //     }
            //     let result = makeApiResponce('QR scan success', 1, OK, userResponce);
            //     return res.json(result);
            // }

            // const qrSingle = await qrSingleMdel.aggregate(
            //     [
            //         {$match : {_id : req.body.bagID._id}},
            //         {
            //             $lookup: {
            //                 from: "qrbatches",
            //                 localField: "qrBatch",
            //                 foreignField: "_id",
            //                 as: "batch",
            //             }
            //         }

            //     ]
            //     )

            // return res.json(result);
        } catch (err) {
            let result = makeApiResponce(err.message, 0, INTERNAL_SERVER_ERROR, err.message);
            return res.status(INTERNAL_SERVER_ERROR).json(result)
        }
    },
    async customerDepositRequest(req, res) {
        try {
            const decoded_id = await decode(req.query.x_auth);
            const findUser = await staffModel.findById(decoded_id);
            if (!findUser) {
                let result = makeApiResponce('Unauthorized Attempt', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            const { error, value } = mobileService.validateDeposit(req.body);
            if (error && error.details) {
                let result = makeApiResponce(error.details[0].message, 0, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            if (req.body.clientID != findUser.company) {
                let result = makeApiResponce('This QR Code does not belongs to your company', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            if (findUser.accountType != "customer") {
                let result = makeApiResponce('Only customer can make deposit', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            if (findUser._id != req.body.customerID) {
                let result = makeApiResponce('This QR is not for you', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            const qrsingle = await qrSingleMdel.findOne({ bagID: req.body.bagID })
            const qrsingle_data = await qrSingleMdel.aggregate([
                { $match: { bagID: req.body.bagID } },
                {
                    $lookup: {
                        from: "companies",
                        localField: "clientID",
                        foreignField: "_id",
                        as: 'company_data',
                        pipeline: [
                            { $project: { companyName: 1 } }
                        ]
                    },
                },
                {
                    $lookup: {
                        from: "staffs",
                        localField: "customerID",
                        foreignField: "_id",
                        as: 'customer_data',
                        pipeline: [
                            { $project: { accountNumber: 1 } }
                        ]
                    }
                }
            ])
            if (qrsingle.ScannedByCustomer) {
                let result = makeApiResponce('QR code is expired', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            if (!qrsingle) {
                let result = makeApiResponce('Bag id is incorrect', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            if (qrsingle.customerID != req.body.customerID) {
                let result = makeApiResponce('Customer ID mismatch', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            // Validattion
            const total = req.body.total.value
            let calculatedTotal = 0
            req.body.Xcd.map(item => {
                calculatedTotal = calculatedTotal + item.value
                console.log('Xcd', calculatedTotal)
            })
            req.body.checks.map(item => {
                calculatedTotal = calculatedTotal + item.checkAmount
                console.log('checks', calculatedTotal)
            })
            req.body.FX.map(item => {
                calculatedTotal = calculatedTotal + item.EQV
                console.log('FX', calculatedTotal)
            })
            if (total != calculatedTotal) {
                let result = makeApiResponce(`Toal you entered (${total}) mismatches original toal of ${calculatedTotal}`, 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            qrsingle.Xcd = req.body.Xcd
            qrsingle.total = req.body.total
            qrsingle.checks = req.body.checks
            qrsingle.FX = req.body.FX
            qrsingle.ScannedByCustomer = true
            const company = await companyModel.findById(qrsingle.clientID, { companyName: 1 })
            await qrsingle.save()
            const customer = await staffModel.findById(qrsingle.customerID)
            let notiRecievreList = []
            notiRecievreList = await staffModel.find({ $or: [{ accountType: "supervisor" }, { accountType: "teller" }], company: findUser.company }, { _id: 1, fcm: 1 })
            for (let i = 0; i < notiRecievreList.length; i++) {
                try {
                    let notificationModel = new NotificationModel();
                    notificationModel.user = notiRecievreList[i]._id;
                    notificationModel.title = "New deposit requested!!!";
                    notificationModel.body = `A new deposit of amount ${req.body.total.value} requested by ${customer.name}.`;
                    notificationModel.type = "newDepositRequest";
                    notificationModel.qr = qrsingle._id
                    await notificationModel.save();
                    await sendNotification(
                        notiRecievreList[i].fcm,
                        {
                            title: "New deposit requested!!!",
                            body: `A new deposit of amount ${req.body.total.value} requested by ${customer.name}.`,
                            qrsingle_data
                        }
                    );
                } catch (error) {
                    console.log(error.response)
                }
            }
            let userResponce = { qrsingle, company }
            let result = makeApiResponce('Deposit success', 1, OK, userResponce);
            return res.json(result);
        } catch (err) {
            let result = makeApiResponce(err.message, 0, INTERNAL_SERVER_ERROR);
            return res.status(INTERNAL_SERVER_ERROR).json(result)
        }
    },
    async TellerCheckRequest(req, res) {
        try {
            const decoded_id = await decode(req.query.x_auth);
            const findUser = await staffModel.findById(decoded_id);
            if (!findUser) {
                let result = makeApiResponce('Unauthorized Attempt', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            const { error, value } = mobileService.validateDeposit(req.body);
            if (error && error.details) {
                let result = makeApiResponce(error.details[0].message, 0, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            if (req.body.clientID != findUser.company) {
                let result = makeApiResponce('This QR Code does not belongs to your company', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            if (findUser.accountType === "customer") {
                let result = makeApiResponce('Only admins can perform this action', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }

            const qrsingle = await qrSingleMdel.findOne({ bagID: req.body.bagID })
            const qrsingle_data = await qrSingleMdel.aggregate([
                { $match: { bagID: req.body.bagID } },
                {
                    $lookup: {
                        from: "companies",
                        localField: "clientID",
                        foreignField: "_id",
                        as: 'company_data',
                        pipeline: [
                            { $project: { companyName: 1 } }
                        ]
                    },
                },
                {
                    $lookup: {
                        from: "staffs",
                        localField: "customerID",
                        foreignField: "_id",
                        as: 'customer_data',
                        pipeline: [
                            { $project: { accountNumber: 1 } }
                        ]
                    }
                }
            ])
            if (!qrsingle) {
                let result = makeApiResponce('Bag id is incorrect', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            if (!qrsingle.ScannedByCustomer) {
                let result = makeApiResponce('QR needs to be scanned by customer first', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            if (qrsingle.ScannedByTeller) {
                let result = makeApiResponce('A bag can only be verified once', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            if (qrsingle.customerID != req.body.customerID) {
                let result = makeApiResponce('Customer ID mismatch', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            let checked = true
            req.body.Xcd.map(item => {
                if (!item.status) {
                    checked = false
                }
            })
            req.body.checks.map(item => {
                if (!item.status) {
                    checked = false
                }
            })
            req.body.FX.map(item => {
                if (!item.status) {
                    checked = false
                }
            })
            if (!req.body.total.status) {
                checked = false
            }
            if (!checked) {
                let result = makeApiResponce('Please verify all values', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            qrsingle.Xcd = req.body.Xcd
            qrsingle.total = req.body.total
            qrsingle.checks = req.body.checks
            qrsingle.FX = req.body.FX
            qrsingle.ScannedByTeller = true
            qrsingle.tellerID = findUser._id
            const company = await companyModel.findById(qrsingle.clientID, { companyName: 1 })
            await qrsingle.save()
            //  Send notification
            const customer = await staffModel.findById(qrsingle.customerID)
            const notificationModel = new NotificationModel();
            notificationModel.user = customer._id;
            notificationModel.qr = qrsingle._id;
            notificationModel.title = "Deposit Approved";
            notificationModel.body = `Your deposit request for ${req.body.total.value} has been approved`;
            notificationModel.type = "depositApproved";
            notificationModel.save();
            await sendNotification(
                customer.fcm,
                {
                    title: "Deposit approved!!!",
                    body: `Your deposit request for ${req.body.total.value} has been approved.`,
                    qrsingle_data
                }
            );
            let userResponce = { qrsingle, customer, company }
            let result = makeApiResponce('Checking success', 1, OK, userResponce);
            return res.json(result);
        } catch (err) {
            let result = makeApiResponce(err.message, 0, INTERNAL_SERVER_ERROR, err.message);
            return res.status(INTERNAL_SERVER_ERROR).json(result)
        }
    },
    async editProfile(req, res) {
        try {
            const decoded_id = await decode(req.query.x_auth);
            const findUser = await staffModel.findById(decoded_id);
            if (!findUser) {
                let result = makeApiResponce('Unauthorized Attempt', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            let company = await companyModel.findById(findUser.company)
            // VALIDATE THE REQUEST
            const { error, value } = staffService.validateEditProfileSchema(req.body);
            if (error && error.details) {
                let result = makeApiResponce(error.details[0].message, 0, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }

            findUser.name = req.body.name;
            findUser.phoneNumber = req.body.phoneNumber;
            await findUser.save();

            let userResponce = {
                userData: findUser,
                company
            }

            let result = makeApiResponce('User updated', 1, OK, userResponce);
            return res.json(result);

        } catch (err) {
            console.log(err);
            let result = makeApiResponce(err.message, 0, INTERNAL_SERVER_ERROR,);
            return res.status(INTERNAL_SERVER_ERROR).json(result)
        }
    },
    async loadCustomerHomePage(req, res) {
        try {
            const decoded_id = await decode(req.query.x_auth);
            const findUser = await staffModel.findById(decoded_id);
            if (!findUser) {
                let result = makeApiResponce('Unauthorized Attempt', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            if (findUser.accountType != "customer") {
                let result = makeApiResponce('Only customer can call this API', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            const d = new Date()
            d.setHours(0, 0, 0, 0)
            d.setDate(1)
            const depositsAllTime = await qrSingleMdel.aggregate([
                { $match: { customerID: findUser._id, ScannedByCustomer: true, clientID: findUser.company } },
                {
                    $lookup: {
                        from: "companies",
                        localField: "clientID",
                        foreignField: "_id",
                        as: "company",
                        pipeline: [
                            { $project: { companyName: 1 } }
                        ]
                    }
                }

            ])
            const depositsThisMonth = await qrSingleMdel.aggregate([
                { $match: { customerID: findUser._id, ScannedByCustomer: true, clientID: findUser.company, createdAt: { $gt: d } } },
                {
                    $lookup: {
                        from: "companies",
                        localField: "clientID",
                        foreignField: "_id",
                        as: "company",
                        pipeline: [
                            { $project: { companyName: 1 } }
                        ]
                    }
                }

            ])
            // const approvedDeposits = await qrSingleMdel.aggregate([
            //     { $match: { customerID: findUser._id, ScannedByCustomer: true, ScannedByTeller: true, clientID: findUser.company } },
            //     {
            //         $lookup: {
            //             from: "companies",
            //             localField: "clientID",
            //             foreignField: "_id",
            //             as: "company",
            //             pipeline: [
            //                 { $project: { companyName: 1 } }
            //             ]
            //         }
            //     }
            // ])

            const totalDepositThisMonth = await qrSingleMdel.aggregate([
                { $match: { customerID: findUser._id, ScannedByCustomer: true, ScannedByTeller: true, clientID: findUser.company, createdAt: { $gte: d } } },
                {
                    $group: {
                        _id: "totalThisMonth",
                        total: { $sum: "$total.value" }
                    }
                }
            ])
            const totalDepositAllTime = await qrSingleMdel.aggregate([
                { $match: { customerID: findUser._id, ScannedByCustomer: true, ScannedByTeller: true, clientID: findUser.company } },
                {
                    $group: {
                        _id: "totalAllTime",
                        total: { $sum: "$total.value" }
                    }
                }
            ])
            const notification = await NotificationModel.findOne({ user: findUser._id, statusBit: true })
            let notification_active = false
            if (notification) {
                notification_active = true
            }
            // let userResponce = {pendingDeposits:pendingDeposits.length,approvedDeposits:approvedDeposits.length,totalDeposit}
            let userResponce = {
                depositsThisMonth: depositsThisMonth.reverse(),
                depositsAllTime: depositsAllTime.reverse(),
                totalDepositThisMonth: totalDepositThisMonth.reverse(),
                totalDepositAllTime: totalDepositAllTime.reverse(),
                notification_active
            }
            let result = makeApiResponce('Home screen loaded', 1, OK, userResponce);
            return res.json(result);
        } catch (err) {
            let result = makeApiResponce(err.message, 0, INTERNAL_SERVER_ERROR,);
            return res.status(INTERNAL_SERVER_ERROR).json(result)
        }
    },
    async loadTellerHomePage(req, res) {
        try {
            const decoded_id = await decode(req.query.x_auth);
            const findUser = await staffModel.findById(decoded_id);
            if (!findUser) {
                let result = makeApiResponce('Unauthorized Attempt', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            // if (findUser.accountType != "teller") {
            //     let result = makeApiResponce('Only teller can call this API', 1, BAD_REQUEST)
            //     return res.status(BAD_REQUEST).json(result);
            // }
            const d = new Date()
            d.setHours(0, 0, 0, 0)
            d.setDate(1)
            const depositsAllTimePending = await qrSingleMdel.aggregate([
                { $match: { ScannedByCustomer: true, ScannedByTeller: false, clientID: findUser.company } },
                {
                    $lookup: {
                        from: "companies",
                        localField: "clientID",
                        foreignField: "_id",
                        as: "company",
                        pipeline: [
                            { $project: { companyName: 1 } }
                        ]
                    }
                },
                {
                    $lookup: {
                        from: "staffs",
                        localField: "customerID",
                        foreignField: "_id",
                        as: "customer_details",
                    }
                }

            ])
            const depositsAllTimeApproved = await qrSingleMdel.aggregate([
                { $match: { ScannedByCustomer: true, ScannedByTeller: true, tellerID: findUser._id, clientID: findUser.company } },
                {
                    $lookup: {
                        from: "companies",
                        localField: "clientID",
                        foreignField: "_id",
                        as: "company",
                        pipeline: [
                            { $project: { companyName: 1 } }
                        ]
                    }
                },
                {
                    $lookup: {
                        from: "staffs",
                        localField: "customerID",
                        foreignField: "_id",
                        as: "customer_details",
                    }
                }

            ])
            const depositsThisMonthPending = await qrSingleMdel.aggregate([
                { $match: { ScannedByCustomer: true, ScannedByTeller: false, clientID: findUser.company, createdAt: { $gte: d } } },
                {
                    $lookup: {
                        from: "companies",
                        localField: "clientID",
                        foreignField: "_id",
                        as: "company",
                        pipeline: [
                            { $project: { companyName: 1 } }
                        ]
                    }
                },
                {
                    $lookup: {
                        from: "staffs",
                        localField: "customerID",
                        foreignField: "_id",
                        as: "customer_details",
                    }
                }

            ])
            const depositsThisMonthApproved = await qrSingleMdel.aggregate([
                { $match: { ScannedByCustomer: true, ScannedByTeller: true, tellerID: findUser._id, clientID: findUser.company, createdAt: { $gte: d } } },
                {
                    $lookup: {
                        from: "companies",
                        localField: "clientID",
                        foreignField: "_id",
                        as: "company",
                        pipeline: [
                            { $project: { companyName: 1 } }
                        ]
                    }
                },
                {
                    $lookup: {
                        from: "staffs",
                        localField: "customerID",
                        foreignField: "_id",
                        as: "customer_details",
                    }
                }

            ])
            const totalBagsProcessedThisMonth = await qrSingleMdel.aggregate([
                { $match: { ScannedByCustomer: true, ScannedByTeller: true, clientID: findUser.company, tellerID: findUser._id, createdAt: { $gte: d } } },
                {
                    $group: {
                        _id: "bagsProcessedThisMonth",
                        grandTotal: { $sum: 1 }
                    }
                }
            ])
            const totalBagsProcessedAllTime = await qrSingleMdel.aggregate([
                { $match: { ScannedByCustomer: true, ScannedByTeller: true, clientID: findUser.company, tellerID: findUser._id } },
                {
                    $group: {
                        _id: "bagsProcessedAllTime",
                        grandTotal: { $sum: 1 }
                    }
                }
            ])
            const notification = await NotificationModel.findOne({ user: findUser._id, statusBit: true })
            let notification_active = false
            if (notification) {
                notification_active = true
            }
            // let userResponce = {pendingDeposits:pendingDeposits.length,approvedDeposits:approvedDeposits.length,totalDeposit}
            let userResponce = {
                depositsThisMonthPending: depositsThisMonthPending.reverse(),
                depositsThisMonthApproved: depositsThisMonthApproved.reverse(),
                depositsAllTimePending: depositsAllTimePending.reverse(),
                depositsAllTimeApproved: depositsAllTimeApproved.reverse(),
                totalBagsProcessedThisMonth: totalBagsProcessedThisMonth.reverse(),
                totalBagsProcessedAllTime: totalBagsProcessedAllTime.reverse(),
                notification_active
            }
            let result = makeApiResponce('Home screen loaded', 1, OK, userResponce);
            return res.json(result);
        } catch (err) {
            let result = makeApiResponce(err.message, 0, INTERNAL_SERVER_ERROR,);
            return res.status(INTERNAL_SERVER_ERROR).json(result)
        }
    },
    // async loadSupervisorHomePage(req, res) {
    //     try {
    //         const decoded_id = await decode(req.query.x_auth);
    //         const findUser = await staffModel.findById(decoded_id);
    //         if (!findUser) {
    //             let result = makeApiResponce('Unauthorized Attempt', 1, BAD_REQUEST)
    //             return res.status(BAD_REQUEST).json(result);
    //         }
    //         if (findUser.accountType != "supervisor") {
    //             let result = makeApiResponce('Only supervisor can call this API', 1, BAD_REQUEST)
    //             return res.status(BAD_REQUEST).json(result);
    //         }
    //         const d =new Date()
    //         d.setMonth(d.getMonth()-1)
    //         const pendingDeposits = await qrSingleMdel.aggregate([
    //             {$match : { ScannedByCustomer: true, clientID: findUser.company, ScannedByTeller: false }},
    //             {
    //                 $lookup : {
    //                     from : "companies",
    //                     localField: "clientID",
    //                     foreignField: "_id",
    //                     as : "company",
    //                     pipeline : [
    //                         {$project: {companyName:1}}
    //                     ]
    //                 }
    //             }
    //             ])
    //         const approvedDeposits = await qrSingleMdel.aggregate([
    //             {$match : { ScannedByCustomer: true, clientID: findUser.company, ScannedByTeller: true, tellerID: findUser._id }},
    //             {
    //                 $lookup : {
    //                     from : "companies",
    //                     localField: "clientID",
    //                     foreignField: "_id",
    //                     as : "company",
    //                     pipeline : [
    //                         {$project: {companyName:1}}
    //                     ]
    //                 }
    //             }
    //         ])
    //         const totalBagsProcessed = await qrSingleMdel.aggregate([
    //             { $match: { ScannedByCustomer: true, clientID: findUser.company, ScannedByTeller: true ,tellerID : findUser._id,createdAt : {$gt : d}} },
    //             {
    //                 $group: {
    //                     _id: "grandTotal",
    //                     grandTotal: { $sum: 1 }
    //                 }
    //             }
    //         ])
    //         // let userResponce = {pendingDeposits:pendingDeposits.length,approvedDeposits:approvedDeposits.length,totalDeposit}
    //         let userResponce = { pendingDeposits, approvedDeposits, totalBagsProcessed }
    //         let result = makeApiResponce('Home screen loaded', 1, OK, userResponce);
    //         return res.json(result);
    //     } catch (err) {
    //         let result = makeApiResponce(err.message, 0, INTERNAL_SERVER_ERROR,);
    //         return res.status(INTERNAL_SERVER_ERROR).json(result)
    //     }
    // },
    async bagRequest(req, res) {
        try {
            const decoded_id = await decode(req.query.x_auth);
            const findUser = await staffModel.findById(decoded_id);
            if (!findUser) {
                let result = makeApiResponce('Unauthorized Attempt', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            if (findUser.accountType != "customer") {
                let result = makeApiResponce('Only customer can request for bags', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            if (!req.body.reason) {
                let result = makeApiResponce('reason is not allowed to be empty', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            if (!req.body.bagsCount) {
                let result = makeApiResponce('bagsCount is not allowed to be empty', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            if (!findUser) {
                let result = makeApiResponce('Unauthorized Attempt', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            const company = await companyModel.findById(findUser.company)
            const mail = `
            <h5>A new bag request </h5>
            <p>From: ${findUser.name}</p>
            <p>Reason: ${req.body.reason}</p>
            <p>No. of Bags: ${req.body.bagsCount}</p>
            <p>Pickup location: ${req.body.pickupLocation}</p>
            <p>Notes: ${req.body.notes}</p>
            `;
            // node mailer
            const request = new bagRequestModel()
            request.user = findUser._id
            request.reason = req.body.reason
            request.pickupLocation = req.body.pickupLocation
            request.notes = req.body.notes
            request.bagsCount = req.body.bagsCount
            await request.save()
            await sendEmail({
                html: mail,
                subject: "New bag request",
                email: company.email,
            });
            let notiRecievreList = []
            notiRecievreList = await staffModel.find({ accountType: "supervisor", company: findUser.company }, { _id: 1, fcm: 1 })
            for (let i = 0; i < notiRecievreList.length; i++) {
                try {
                    await sendNotification(
                        notiRecievreList[i].fcm,
                        {
                            title: "New bag request!!!",
                            body: `${req.body.bagsCount} new bags were requested by ${findUser.name}.`,
                        }
                    );
                    let notificationModel = new NotificationModel();
                    notificationModel.user = notiRecievreList[i]._id;
                    notificationModel.title = "New bag requested";
                    notificationModel.body = `${req.body.bagsCount} new bags were requested by ${findUser.name} with email ${findUser.email}`;
                    notificationModel.type = "newBagRequested";
                    await notificationModel.save();
                } catch (error) {
                    console.log(error.response)
                }
            }

            let userResponce = {}
            let result = makeApiResponce('New bag request submitted', 1, OK, userResponce);
            return res.json(result);
        } catch (err) {
            let result = makeApiResponce(err.message, 0, INTERNAL_SERVER_ERROR,);
            return res.status(INTERNAL_SERVER_ERROR).json(result)
        }
    },
    async listOfNotifications(req, res) {
        try {
            const decoded_id = await decode(req.query.x_auth);
            const findUser = await staffModel.findById(decoded_id);
            if (!findUser) {
                let result = makeApiResponce('Unauthorized Attempt', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            let getNotifications = await NotificationModel.aggregate([
                { $match: { user: findUser._id } },
                {
                    $lookup: {
                        from: "qrsingles",
                        localField: "qr",
                        foreignField: "_id",
                        as: 'qr_data',
                        pipeline: [
                            {
                                $lookup: {
                                    from: "companies",
                                    localField: "clientID",
                                    foreignField: "_id",
                                    as: 'company_data',
                                    pipeline: [
                                        { $project: { companyName: 1 } }
                                    ]
                                },
                            },
                            {
                                $lookup: {
                                    from: "staffs",
                                    localField: "customerID",
                                    foreignField: "_id",
                                    as: 'customer_data',
                                    pipeline: [
                                        { $project: { accountNumber: 1, name: 1 } }
                                    ]
                                }
                            }
                        ]
                    },
                },

            ]);
            for (let i = 0; i < getNotifications.length; i++) {
                await NotificationModel.findByIdAndUpdate(getNotifications[i]._id, { statusBit: false })
            }
            if (!getNotifications) {
                let result = makeApiResponce('Empty list Notifications', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            let userResponce = { getNotifications }
            let result = makeApiResponce('Notification List loaded', 1, OK, userResponce);
            return res.json(result);

        } catch (err) {
            console.log(err);
            let result = makeApiResponce('INTERNAL_SERVER_ERROR', 0, INTERNAL_SERVER_ERROR);
            return res.status(INTERNAL_SERVER_ERROR).json(result)
        }
    },
    async addNotification(req, res) {
        try {
            const notificationModel = new NotificationModel();
            notificationModel.user = mongoose.Types.ObjectId(req.body.user);
            notificationModel.title = req.body.title;
            notificationModel.body = req.body.body;
            notificationModel.type = req.body.type;
            notificationModel.save();
            let notificationResponce = {
                id: notificationModel._id
            }
            let result = makeApiResponce('Notification Created Successfully', 1, OK, notificationResponce);
            return res.json(result);

        } catch (err) {
            console.log(err);
            let result = makeApiResponce('INTERNAL_SERVER_ERROR', 0, INTERNAL_SERVER_ERROR);
            return res.status(INTERNAL_SERVER_ERROR).json(result)
        }
    },
    async changeNotificationStatus(req, res) {
        try {
            const notification = await NotificationModel.findByIdAndUpdate(req.params.id, { statusBit: true })
            let userResponce = {
            }
            let result = makeApiResponce('Notification status changed to read', 1, OK, userResponce);
            return res.json(result);

        } catch (err) {
            console.log(err);
            let result = makeApiResponce('INTERNAL_SERVER_ERROR', 0, INTERNAL_SERVER_ERROR);
            return res.status(INTERNAL_SERVER_ERROR).json(result)
        }
    },
    async changeBagRequestStatus(req, res) {
        try {
            const request = await bagRequestModel.findByIdAndUpdate(req.params.id, { statusBit: true })
            let userResponce = {
            }
            let result = makeApiResponce('Bag request status changed to read', 1, OK, userResponce);
            return res.json(result);

        } catch (err) {
            console.log(err);
            let result = makeApiResponce('INTERNAL_SERVER_ERROR', 0, INTERNAL_SERVER_ERROR);
            return res.status(INTERNAL_SERVER_ERROR).json(result)
        }
    },
    async removeNotification(req, res) {
        try {
            const notification = await NotificationModel.findByIdAndDelete(req.params.id)
            let userResponce = {

            }
            let result = makeApiResponce('Notification deleted', 1, OK, userResponce);
            return res.json(result);

        } catch (err) {
            console.log(err);
            let result = makeApiResponce('INTERNAL_SERVER_ERROR', 0, INTERNAL_SERVER_ERROR);
            return res.status(INTERNAL_SERVER_ERROR).json(result)
        }
    },
    //  Reports
    async TotalDepositsReportCompany(req, res) {
        try {
            let startingDate = new Date(req.body.startingDate)
            const endingDate = new Date(req.body.endingDate)
            endingDate.setDate(endingDate.getDate() + 1)
            const decoded_id = await decode(req.query.x_auth);
            const findUser = await staffModel.findById(decoded_id);
            if (!findUser) {
                let result = makeApiResponce('Unauthorized Attempt', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            if (findUser.accountType != "supervisor") {
                let result = makeApiResponce('Only supervisor can call this API', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            if (startingDate >= endingDate) {
                let result = makeApiResponce('Starting date must not to greater than or equal to ending date', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            let totalDeposits = await qrSingleMdel.aggregate([
                { $match: { clientID: findUser.company, ScannedByCustomer: true, ScannedByTeller: true, createdAt: { $gte: startingDate, $lte: endingDate } } },
                {
                    $lookup: {
                        from: "staffs",
                        localField: "customerID",
                        foreignField: "_id",
                        as: 'customerDetails'
                    }
                },
                {
                    $lookup: {
                        from: "staffs",
                        localField: "tellerID",
                        foreignField: "_id",
                        as: 'tellerDetails'
                    }
                },
                {
                    $addFields: {
                        name: '$customerDetails.name',
                        email: '$customerDetails.email',
                        totalInLocal: { $sum: '$Xcd.value' },
                        totalInFX: { $sum: '$FX.EQV' },
                        totalInChecks: { $sum: '$checks.checkAmount' },
                        grandTotal: '$total.value',
                    }
                },
                {
                    $project: {
                        name: { $arrayElemAt: ["$customerDetails.name", 0] },
                        email: { $arrayElemAt: ["$customerDetails.email", 0] },
                        _id: 0,
                        totalInLocal: 1,
                        totalInFX: 1,
                        totalInChecks: 1,
                        grandTotal: 1,
                        tellerName: { $arrayElemAt: ["$tellerDetails.name", 0] },
                        tellerEmail: { $arrayElemAt: ["$tellerDetails.email", 0] },
                        createdAt: 1,
                        updatedAt: 1,
                        dateCreated: { $dateToString: { format: "%Y-%m-%d / %H:%M:%S", date: "$createdAt" } },
                        dateUpdated: { $dateToString: { format: "%Y-%m-%d / %H:%M:%S", date: "$updatedAt" } }
                    },
                },
            ])
            let totalAmountDeposited = await qrSingleMdel.aggregate([
                { $match: { clientID: findUser.company, ScannedByCustomer: true, ScannedByTeller: true, createdAt: { $gte: startingDate, $lte: endingDate } } },
                {
                    $group: {
                        _id: "totalAmount",
                        total: { $sum: "$total.value" }
                    }
                }
            ])
            const csvWriter = createCsvWriter({
                path: `reports/Total_deposits_report_company_${findUser._id}.csv`,
                header: [
                    { id: 'name', title: 'Customer Name' },
                    { id: 'email', title: 'Customer Email' },
                    { id: 'totalInLocal', title: 'Amount (Local currency)' },
                    { id: 'totalInFX', title: 'Amount (FX)' },
                    { id: 'totalInChecks', title: 'Amount (Checks)' },
                    { id: 'grandTotal', title: 'Total amount' },
                    { id: 'tellerName', title: 'Verifier Name' },
                    { id: 'tellerEmail', title: 'Verifier Email)' },
                    { id: 'dateCreated', title: 'Created At' },
                    { id: 'dateUpdated', title: 'Verified At' },
                ]
            });
            let myHeader = [
                {
                    dateCreated: '',
                    dateUpdated: '',
                    totalInLocal: '',
                    totalInFX: '',
                    grandTotal: `Total = ${totalAmountDeposited.length > 0 ? totalAmountDeposited[0].total : 0}`,
                    name: '',
                    email: '',
                    tellerName: '',
                    tellerEmail: '',
                }
            ]
            let headers = ['Sr.', 'Customer Name', 'Customer Email', 'Amount (Local currency)', 'Amount (FX)', 'Amount (Checks)', 'Total amount', 'Verifier Name', 'Verifier Email', 'Created At', 'Updated At']
            let title = "Total Deposits Report"
            csvWriter
                .writeRecords(myHeader.concat(totalDeposits).reverse())
            let table = `
                <p style="text-align:center;">${req.body.startingDate} - ${req.body.endingDate}<span style="font-weight:bold;font-size:24px;margin-left:50px;margin-right:50px;">${title}</span>Total amount : $${totalAmountDeposited.length > 0 ? totalAmountDeposited[0].total : 0}</p>
                `
            table += "<table border='1' style='width:100%;word-break:break-word;'>";
            table += "<tr>";
            headers.map(item => {
                table += `<th >${item}</th>`;
            })
            table += "</tr>";

            totalDeposits.reverse().forEach(function (row, index) {
                table += "<tr>";
                table += "<td style='text-align:left;'>" + (index + 1) + "</td>";
                table += "<td>" + row.name + "</td>";
                table += "<td>" + row.email + "</td>";
                table += "<td style='text-align:right;'>" + row.totalInLocal + "</td>";
                table += "<td style='text-align:right;'>" + row.totalInChecks + "</td>";
                table += "<td style='text-align:right;'>" + row.totalInFX + "</td>";
                table += "<td style='text-align:right;'>" + row.grandTotal + "</td>";
                table += "<td style='text-align:left;'>" + row.tellerName + "</td>";
                table += "<td style='text-align:left;'>" + row.tellerEmail + "</td>";
                table += "<td style='text-align:center;'>" + row.dateCreated + "</td>";
                table += "<td style='text-align:center;'>" + row.dateUpdated + "</td>";
                table += "</tr>";
            });
            table += "</table>";

            var options = {
                "format": "A4",
                "orientation": "landscape",
                "border": {
                    "top": "0.1in",
                },
                "timeout": "120000"
            };
            pdf.create(table, options).toFile(`reports/Total_deposits_report_company_${findUser._id}.pdf`, function (err, result) {
                if (err) {
                    throw (err)
                } else {
                    let userResponce = {
                        length: totalDeposits.length,
                        downloadPDF: `${basr_url}/reports/Total_deposits_report_company_${findUser._id}.pdf`,
                        downloadCSV: `${basr_url}/reports/Total_deposits_report_company_${findUser._id}.csv`
                    }
                    let result = makeApiResponce(`Total deposits report generated`, 1, OK, userResponce);
                    return res.json(result);
                }
            })
        } catch (err) {
            console.log(err)
            let result = makeApiResponce(err, 0, INTERNAL_SERVER_ERROR);
            return res.status(INTERNAL_SERVER_ERROR).json(result)
        }
    },
    async TotalDepositsReportCustomer(req, res) {
        try {
            let startingDate = new Date(req.body.startingDate)
            const endingDate = new Date(req.body.endingDate)
            endingDate.setDate(endingDate.getDate() + 1)
            const decoded_id = await decode(req.query.x_auth);
            const findUser = await staffModel.findById(decoded_id);
            if (!findUser) {
                let result = makeApiResponce('Unauthorized Attempt', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            if (findUser.accountType != "customer") {
                let result = makeApiResponce('Only customer can call this API', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            if (startingDate >= endingDate) {
                let result = makeApiResponce('Starting date must not to greater than or equal to ending date', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            let totalDeposits = await qrSingleMdel.aggregate([
                { $match: { customerID: findUser._id, clientID: findUser.company, ScannedByCustomer: true, ScannedByTeller: true, createdAt: { $gte: startingDate, $lte: endingDate } } },
                {
                    $lookup: {
                        from: "staffs",
                        localField: "customerID",
                        foreignField: "_id",
                        as: 'customerDetails'
                    }
                },
                {
                    $addFields: {
                        totalInLocal: { $sum: '$Xcd.value' },
                        totalInFX: { $sum: '$FX.EQV' },
                        totalInChecks: { $sum: '$checks.checkAmount' },
                        grandTotal: '$total.value',
                    }
                },
                {
                    $project: {
                        _id: 0,
                        totalInLocal: 1,
                        totalInFX: 1,
                        totalInChecks: 1,
                        grandTotal: 1,
                        grandTotal: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        dateCreated: { $dateToString: { format: "%Y-%m-%d / %H:%M:%S", date: "$createdAt" } },
                        dateUpdated: { $dateToString: { format: "%Y-%m-%d / %H:%M:%S", date: "$updatedAt" } }
                    },
                },
            ])
            console.log(totalDeposits)
            let totalAmountDeposited = await qrSingleMdel.aggregate([
                { $match: { customerID: findUser._id, clientID: findUser.company, ScannedByCustomer: true, ScannedByTeller: true, createdAt: { $gte: startingDate, $lte: endingDate } } },
                {
                    $group: {
                        _id: "totalAmount",
                        total: { $sum: "$total.value" }
                    }
                }
            ])
            const csvWriter = createCsvWriter({
                path: `reports/Total_deposits_report_customer_${findUser._id}.csv`,
                headerColor: 'red',
                header: [
                    { id: 'totalInLocal', title: 'Amount (Local currency)' },
                    { id: 'totalInFX', title: 'Amount (FX)' },
                    { id: 'totalInChecks', title: 'Amount (Checks)' },
                    { id: 'grandTotal', title: 'Total amount' },
                    { id: 'dateCreated', title: 'Created At' },
                    { id: 'dateUpdated', title: 'Verified At' },
                ]
            });
            let myHeader = [
                {
                    totalInLocal: '',
                    totalInFX: '',
                    totalInChecks: '',
                    grandTotal: `Total = ${totalAmountDeposited.length > 0 ? totalAmountDeposited[0].total : 0}`,
                    dateCreated: '',
                    dateUpdated: '',
                }
            ]
            let headers = ['Sr.', 'Amount (Local currency)', 'Amount (FX)', 'Amount (Checks)', 'Total amount', 'Created At', 'Verified At']
            let title = "Total Deposits Report"
            csvWriter
                .writeRecords(myHeader.concat(totalDeposits).reverse())
                .then(
                    () => {
                        console.log('CSV file created successfully.')
                        // insertTitle('Total-Deposits-Report');
                    }
                );
            let table = `
        <p style="text-align:center;">${req.body.startingDate} - ${req.body.endingDate}<span style="font-weight:bold;font-size:24px;margin-left:50px;margin-right:50px;">${title}</span>Total amount : $${totalAmountDeposited.length > 0 ? totalAmountDeposited[0].total : 0}</p>
        `
            table += "<table border='1' style='width:100%;word-break:break-word;'>";
            table += "<tr>";
            headers.map(item => {
                table += `<th >${item}</th>`;
            })
            table += "</tr>";

            totalDeposits.reverse().forEach(function (row, index) {
                table += "<tr>";
                table += "<td style='text-align:left;'>" + (index + 1) + "</td>";
                table += "<td style='text-align:right;'>" + row.totalInLocal + "</td>";
                table += "<td style='text-align:right;'>" + row.totalInChecks + "</td>";
                table += "<td style='text-align:right;'>" + row.totalInFX + "</td>";
                table += "<td style='text-align:right;'>" + row.grandTotal + "</td>";
                table += "<td style='text-align:center;'>" + row.dateCreated + "</td>";
                table += "<td style='text-align:center;'>" + row.dateUpdated + "</td>";
                table += "</tr>";
            });
            table += "</table>";

            var options = {
                "format": "A4",
                "orientation": "landscape",
                "border": {
                    "top": "0.1in",
                },
                "timeout": "120000"
            };
            pdf.create(table, options).toFile(`reports/Total_deposits_report_customer_${findUser._id}.pdf`, function (err, result) {
                if (err) {
                    throw (err)
                } else {
                    console.log("pdf created")
                    let userResponce = {
                        length: totalDeposits.length,
                        downloadPDF: `${basr_url}/reports/Total_deposits_report_customer_${findUser._id}.pdf`,
                        downloadCSV: `${basr_url}/reports/Total_deposits_report_customer_${findUser._id}.csv`
                    }
                    let result = makeApiResponce(`Total deposits report generated`, 1, OK, userResponce);
                    return res.json(result);
                }
            })
        } catch (err) {
            console.log(err)
            let result = makeApiResponce(err, 0, INTERNAL_SERVER_ERROR);
            return res.status(INTERNAL_SERVER_ERROR).json(result)
        }
    },
    async TotalDepositsReportTeller(req, res) {
        try {
            let startingDate = new Date(req.body.startingDate)
            const endingDate = new Date(req.body.endingDate)
            endingDate.setDate(endingDate.getDate() + 1)
            const decoded_id = await decode(req.query.x_auth);
            const findUser = await staffModel.findById(decoded_id);
            if (!findUser) {
                let result = makeApiResponce('Unauthorized Attempt', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            if (findUser.accountType != "supervisor" && findUser.accountType != "teller") {
                let result = makeApiResponce('Customer cannot call this API', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            if (startingDate >= endingDate) {
                let result = makeApiResponce('Starting date must not to greater than or equal to ending date', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            let totalDeposits
            let totalAmountDeposited
            if (findUser.accountType === "teller") {
                totalDeposits = await qrSingleMdel.aggregate([
                    { $match: { tellerID: findUser._id, clientID: findUser.company, ScannedByCustomer: true, ScannedByTeller: true, createdAt: { $gte: startingDate, $lte: endingDate } } },
                    {
                        $lookup: {
                            from: "staffs",
                            localField: "customerID",
                            foreignField: "_id",
                            as: 'customerDetails'
                        }
                    },
                    {
                        $addFields: {
                            name: '$customerDetails.name',
                            email: '$customerDetails.email',
                            totalInLocal: { $sum: '$Xcd.value' },
                            totalInFX: { $sum: '$FX.EQV' },
                            totalInChecks: { $sum: '$checks.checkAmount' },
                            grandTotal: '$total.value',
                        }
                    },
                    {
                        $project: {
                            name: { $arrayElemAt: ["$customerDetails.name", 0] },
                            email: { $arrayElemAt: ["$customerDetails.email", 0] },
                            _id: 0,
                            totalInLocal: 1,
                            totalInFX: 1,
                            totalInChecks: 1,
                            grandTotal: 1,
                            createdAt: 1,
                            updatedAt: 1,
                            dateCreated: { $dateToString: { format: "%Y-%m-%d / %H:%M:%S", date: "$createdAt" } },
                            dateUpdated: { $dateToString: { format: "%Y-%m-%d / %H:%M:%S", date: "$updatedAt" } }
                        },
                    },
                ])

                totalAmountDeposited = await qrSingleMdel.aggregate([
                    { $match: { tellerID: findUser._id, clientID: findUser.company, ScannedByCustomer: true, ScannedByTeller: true, createdAt: { $gte: startingDate, $lte: endingDate } } },
                    {
                        $group: {
                            _id: "totalAmount",
                            total: { $sum: "$total.value" }
                        }
                    }
                ])
            } else if (findUser.accountType === "supervisor") {
                totalDeposits = await qrSingleMdel.aggregate([
                    { $match: { tellerID: findUser._id, clientID: findUser.company, ScannedByCustomer: true, ScannedByTeller: true, createdAt: { $gte: startingDate, $lte: endingDate } } },
                    {
                        $lookup: {
                            from: "staffs",
                            localField: "customerID",
                            foreignField: "_id",
                            as: 'customerDetails'
                        }
                    },
                    {
                        $addFields: {
                            name: '$customerDetails.name',
                            email: '$customerDetails.email',
                            totalInLocal: { $sum: '$Xcd.value' },
                            totalInFX: { $sum: '$FX.EQV' },
                            totalInChecks: { $sum: '$checks.checkAmount' },
                            grandTotal: '$total.value',
                        }
                    },
                    {
                        $project: {
                            name: { $arrayElemAt: ["$customerDetails.name", 0] },
                            email: { $arrayElemAt: ["$customerDetails.email", 0] },
                            _id: 0,
                            totalInLocal: 1,
                            totalInFX: 1,
                            totalInChecks: 1,
                            grandTotal: 1,
                            createdAt: 1,
                            updatedAt: 1,
                            dateCreated: { $dateToString: { format: "%Y-%m-%d / %H:%M:%S", date: "$createdAt" } },
                            dateUpdated: { $dateToString: { format: "%Y-%m-%d / %H:%M:%S", date: "$updatedAt" } }
                        },
                    },
                ])

                totalAmountDeposited = await qrSingleMdel.aggregate([
                    { $match: { tellerID: findUser._id, clientID: findUser.company, ScannedByCustomer: true, ScannedByTeller: true, createdAt: { $gte: startingDate, $lte: endingDate } } },
                    {
                        $group: {
                            _id: "totalAmount",
                            total: { $sum: "$total.value" }

                        }
                    }
                ])
            }
            const csvWriter = createCsvWriter({
                path: `reports/Total_deposits_report_teller_${findUser._id}.csv`,
                headerColor: 'red',
                header: [
                    { id: 'name', title: 'Name' },
                    { id: 'email', title: 'Email' },
                    { id: 'totalInLocal', title: 'Amount (Local currency)' },
                    { id: 'totalInFX', title: 'Amount (FX)' },
                    { id: 'totalInChecks', title: 'Amount (Checks)' },
                    { id: 'grandTotal', title: 'Total amount' },
                    { id: 'dateCreated', title: 'Created At' },
                    { id: 'dateUpdated', title: 'Verified At' },
                ]
            });
            let headers = ['Sr.', 'Name', 'Email', 'Amount (Local currency)', 'Amount (FX)', 'Amount (Checks)', 'Total amount', 'Created At', 'Updated At']
            let title = "Total Deposits Report"
            let myHeader = [
                {
                    name: '',
                    email: '',
                    totalInLocal: '',
                    totalInFX: '',
                    totalInChecks: '',
                    grandTotal: `Total = ${totalAmountDeposited.length > 0 ? totalAmountDeposited[0].total : 0}`,
                    dateCreated: '',
                    dateUpdated: '',
                }
            ]
            csvWriter
                .writeRecords(myHeader.concat(totalDeposits).reverse())
                .then(
                    () => {
                        console.log('CSV file created successfully.')
                    }
                );

            let table = `
                <p style="text-align:center;">${req.body.startingDate} - ${req.body.endingDate}<span style="font-weight:bold;font-size:24px;margin-left:50px;margin-right:50px;">${title}</span>Total amount : $${totalAmountDeposited.length > 0 ? totalAmountDeposited[0].total : 0}</p>
                `
            table += "<table border='1' style='width:100%;word-break:break-word;'>";
            table += "<tr>";
            headers.map(item => {
                table += `<th >${item}</th>`;
            })
            table += "</tr>";

            totalDeposits.reverse().forEach(function (row, index) {
                table += "<tr>";
                table += "<td style='text-align:left;'>" + (index + 1) + "</td>";
                table += "<td>" + row.name + "</td>";
                table += "<td>" + row.email + "</td>";
                table += "<td style='text-align:right;'>" + row.totalInLocal + "</td>";
                table += "<td style='text-align:right;'>" + row.totalInChecks + "</td>";
                table += "<td style='text-align:right;'>" + row.totalInFX + "</td>";
                table += "<td style='text-align:right;'>" + row.grandTotal + "</td>";
                table += "<td style='text-align:center;'>" + row.dateCreated + "</td>";
                table += "<td style='text-align:center;'>" + row.dateUpdated + "</td>";
                table += "</tr>";
            });
            table += "</table>";

            var options = {
                "format": "A4",
                "orientation": "landscape",
                "border": {
                    "top": "0.1in",
                },
                "timeout": "120000"
            };
            pdf.create(table, options).toFile(`reports/Total_deposits_report_teller_${findUser._id}.pdf`, function (err, result) {
                if (err) {
                    throw (err)
                } else {
                    console.log("pdf created")
                    let userResponce = {
                        length: totalDeposits.length,
                        downloadPDF: `${basr_url}/reports/Total_deposits_report_teller_${findUser._id}.pdf`,
                        downloadCSV: `${basr_url}/reports/Total_deposits_report_teller_${findUser._id}.csv`
                    }
                    let result = makeApiResponce(`Total deposits report generated`, 1, OK, userResponce);
                    return res.json(result);
                }
            })
        } catch (err) {
            console.log(err)
            let result = makeApiResponce(err, 0, INTERNAL_SERVER_ERROR);
            return res.status(INTERNAL_SERVER_ERROR).json(result)
        }
    },
    async TotalCustomersReportCompany(req, res) {
        try {
            let startingDate = new Date(req.body.startingDate)
            const endingDate = new Date(req.body.endingDate)
            endingDate.setDate(endingDate.getDate() + 1)
            const decoded_id = await decode(req.query.x_auth);
            const findUser = await staffModel.findById(decoded_id);
            if (!findUser) {
                let result = makeApiResponce('Unauthorized Attempt', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            if (findUser.accountType != "supervisor") {
                let result = makeApiResponce('Only supervisor can call this API', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            if (startingDate >= endingDate) {
                let result = makeApiResponce('Starting date must not to greater than or equal to ending date', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }

            let totalCustomers = await staffModel.aggregate([
                { $match: { accountType: 'customer', company: findUser.company } },
                { $addFields: { dateCreated: '' } },
                {
                    $project: {
                        name: 1,
                        email: 1,
                        createdAt: 1,
                        dateCreated: { $dateToString: { format: "%Y-%m-%d / %H:%M:%S", date: "$createdAt" } },
                    }
                }
            ])

            const csvWriter = createCsvWriter({
                path: `reports/Total_customers_report_company_${findUser._id}.csv`,
                headerColor: 'red',
                header: [
                    { id: 'name', title: 'Name' },
                    { id: 'email', title: 'Email' },
                    { id: 'dateCreated', title: 'Created At' },
                ]
            });
            let headers = ['Sr.', 'Name', 'Email', 'Created At']
            let title = "Total Customers Report"
            let myHeader = [
                {
                    name: '',
                    email: '',
                    dateCreated: `Total = ${totalCustomers.length}`,
                }
            ]
            csvWriter
                .writeRecords(myHeader.concat(totalCustomers).reverse())
                .then(
                    () => {
                    }
                );
            let table = `
                <p style="text-align:center;">${req.body.startingDate} - ${req.body.endingDate}<span style="font-weight:bold;font-size:24px;margin-left:50px;margin-right:50px;">${title}</span>Total customers : ${totalCustomers.length}</p>
                `
            table += "<table border='1' style='width:100%;word-break:break-word;'>";
            table += "<tr>";
            headers.map(item => {
                table += `<th >${item}</th>`;
            })
            table += "</tr>";

            totalCustomers.reverse().forEach(function (row, index) {
                table += "<tr>";
                table += "<td style='text-align:left;'>" + (index + 1) + "</td>";
                table += "<td>" + row.name + "</td>";
                table += "<td>" + row.email + "</td>";
                table += "<td style='text-align:center;'>" + row.dateCreated + "</td>";
                table += "</tr>";
            });
            table += "</table>";

            var options = {
                "format": "A4",
                "orientation": "landscape",
                "border": {
                    "top": "0.1in",
                },
                "timeout": "120000"
            };
            pdf.create(table, options).toFile(`reports/Total_customers_report_company_${findUser._id}.pdf`, function (err, result) {
                if (err) {
                    throw (err)
                } else {
                    let userResponce = {
                        length: totalCustomers.length,
                        downloadPDF: `${basr_url}/reports/Total_customers_report_company_${findUser._id}.pdf`,
                        downloadCSV: `${basr_url}/reports/Total_customers_report_company_${findUser._id}.csv`
                    }
                    let result = makeApiResponce(`Total customers report generated`, 1, OK, userResponce);
                    return res.json(result);
                }
            })
        } catch (err) {
            console.log(err)
            let result = makeApiResponce(err, 0, INTERNAL_SERVER_ERROR);
            return res.status(INTERNAL_SERVER_ERROR).json(result)
        }
    },
    async TotalQRGeneratedReport(req, res) {
        try {
            let startingDate = new Date(req.body.startingDate)
            const endingDate = new Date(req.body.endingDate)
            endingDate.setDate(endingDate.getDate() + 1)
            const decoded_id = await decode(req.query.x_auth);
            const findUser = await staffModel.findById(decoded_id);
            if (!findUser) {
                let result = makeApiResponce('Unauthorized Attempt', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            if (findUser.accountType != "customer") {
                let result = makeApiResponce('Only customer can call this API', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            if (startingDate >= endingDate) {
                let result = makeApiResponce('Starting date must not to greater than or equal to ending date', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }

            let QrList = await qrSingleMdel.aggregate([
                { $match: { customerID: findUser._id, clientID: findUser.company } },
                {
                    $addFields: {
                        dateCreated: '',
                        status: {
                            $cond: {
                                if: { $and: ['$ScannedByCustomer', '$ScannedByTeller'] }, then: 'Approved', else:
                                    { $cond: { if: '$ScannedByCustomer', then: 'Pending', else: 'UnScanned' } }
                            }
                        }
                    }
                },
                {
                    $project: {
                        bagID: 1,
                        ScannedByCustomer: 1,
                        ScannedByTeller: 1,
                        status: 1,
                        dateCreated: { $dateToString: { format: "%Y-%m-%d / %H:%M:%S", date: "$createdAt" } },
                    }
                }
            ])
            const csvWriter = createCsvWriter({
                path: `reports/Total_QR_Generated_report_${findUser._id}.csv`,
                headerColor: 'red',
                header: [
                    { id: 'bagID', title: 'BagID' },
                    { id: 'status', title: 'Status' },
                    { id: 'dateCreated', title: 'Created At' },
                ]
            });
            let headers = ['Sr.', 'bagID', 'Status', 'Created At']
            let title = "Total QR Generated Report"
            let myHeader = [
                {
                    bagID: '',
                    status: '',
                    dateCreated: `Total = ${QrList.length}`,
                }
            ]
            csvWriter
                .writeRecords(myHeader.concat(QrList).reverse())
                .then(
                    () => {
                    }
                );
            let table = `
                <p style="text-align:center;">${req.body.startingDate} - ${req.body.endingDate}<span style="font-weight:bold;font-size:24px;margin-left:50px;margin-right:50px;">${title}</span>Total QR codes generated : ${QrList.length}</p>
                `
            table += "<table border='1' style='width:100%;word-break:break-word;'>";
            table += "<tr>";
            headers.map(item => {
                table += `<th >${item}</th>`;
            })
            table += "</tr>";

            QrList.reverse().forEach(function (row, index) {
                table += "<tr>";
                table += "<td style='text-align:left;'>" + (index + 1) + "</td>";
                table += "<td>" + row.bagID + "</td>";
                table += "<td>" + row.status + "</td>";
                table += "<td style='text-align:center;'>" + row.dateCreated + "</td>";
                table += "</tr>";
            });
            table += "</table>";

            var options = {
                "format": "A4",
                "orientation": "landscape",
                "border": {
                    "top": "0.1in",
                },
                "timeout": "120000"
            };
            pdf.create(table, options).toFile(`reports/Total_QR_Generated_report_${findUser._id}.pdf`, function (err, result) {
                if (err) {
                    throw (err)
                } else {
                    let userResponce = {
                        length: QrList.length,
                        downloadPDF: `${basr_url}/reports/Total_QR_Generated_report_${findUser._id}.pdf`,
                        downloadCSV: `${basr_url}/reports/Total_QR_Generated_report_${findUser._id}.csv`
                    }
                    let result = makeApiResponce(`Total customers report generated`, 1, OK, userResponce);
                    return res.json(result);
                }
            })
        } catch (err) {
            console.log(err)
            let result = makeApiResponce(err, 0, INTERNAL_SERVER_ERROR);
            return res.status(INTERNAL_SERVER_ERROR).json(result)
        }
    },
    async TotalQRGeneratedReportCompany(req, res) {
        try {
            let startingDate = new Date(req.body.startingDate)
            const endingDate = new Date(req.body.endingDate)
            endingDate.setDate(endingDate.getDate() + 1)
            const decoded_id = await decode(req.query.x_auth);
            const findUser = await staffModel.findById(decoded_id);
            if (!findUser) {
                let result = makeApiResponce('Unauthorized Attempt', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            if (findUser.accountType != "supervisor") {
                let result = makeApiResponce('Only supervisor can call this API', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            if (startingDate >= endingDate) {
                let result = makeApiResponce('Starting date must not to greater than or equal to ending date', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }

            let QrList = await qrSingleMdel.aggregate([
                { $match: { clientID: findUser.company } },
                {
                    $addFields: {
                        dateCreated: '',
                        status: {
                            $cond: {
                                if: { $and: ['$ScannedByCustomer', '$ScannedByTeller'] }, then: 'Approved', else:
                                    { $cond: { if: '$ScannedByCustomer', then: 'Pending', else: 'UnScanned' } }
                            }
                        }
                    }
                },
                {
                    $project: {
                        bagID: 1,
                        ScannedByCustomer: 1,
                        ScannedByTeller: 1,
                        status: 1,
                        dateCreated: { $dateToString: { format: "%Y-%m-%d / %H:%M:%S", date: "$createdAt" } },
                    }
                }
            ])
            const csvWriter = createCsvWriter({
                path: `reports/Total_QR_Generated_report_company_${findUser._id}.csv`,
                headerColor: 'red',
                header: [
                    { id: 'bagID', title: 'BagID' },
                    { id: 'status', title: 'Status' },
                    { id: 'dateCreated', title: 'Created At' },
                ]
            });
            let headers = ['Sr.', 'bagID', 'Status', 'Created At']
            let title = "Total QR Generated Report"
            let myHeader = [
                {
                    bagID: '',
                    status: '',
                    dateCreated: `Total = ${QrList.length}`,
                }
            ]
            csvWriter
                .writeRecords(myHeader.concat(QrList).reverse())
                .then(
                    () => {
                    }
                );
            let table = `
                <p style="text-align:center;">${req.body.startingDate} - ${req.body.endingDate}<span style="font-weight:bold;font-size:24px;margin-left:50px;margin-right:50px;">${title}</span>Total QR codes generated: ${QrList.length}</p>
                `
            table += "<table border='1' style='width:100%;word-break:break-word;'>";
            table += "<tr>";
            headers.map(item => {
                table += `<th >${item}</th>`;
            })
            table += "</tr>";

            QrList.reverse().forEach(function (row, index) {
                table += "<tr>";
                table += "<td style='text-align:left;'>" + (index + 1) + "</td>";
                table += "<td>" + row.bagID + "</td>";
                table += "<td>" + row.status + "</td>";
                table += "<td style='text-align:center;'>" + row.dateCreated + "</td>";
                table += "</tr>";
            });
            table += "</table>";

            var options = {
                "format": "A4",
                "orientation": "landscape",
                "border": {
                    "top": "0.1in",
                },
                "timeout": "120000"
            };
            pdf.create(table, options).toFile(`reports/Total_QR_Generated_report_company_${findUser._id}.pdf`, function (err, result) {
                if (err) {
                    throw (err)
                } else {
                    let userResponce = {
                        length: QrList.length,
                        downloadPDF: `${basr_url}/reports/Total_deposits_report_company_${findUser._id}.pdf`,
                        downloadCSV: `${basr_url}/reports/Total_deposits_report_company_${findUser._id}.csv`
                    }
                    let result = makeApiResponce(`Total customers report generated`, 1, OK, userResponce);
                    return res.json(result);
                }
            })
        } catch (err) {
            console.log(err)
            let result = makeApiResponce(err, 0, INTERNAL_SERVER_ERROR);
            return res.status(INTERNAL_SERVER_ERROR).json(result)
        }
    },
    async ToatalDepositedPerCustomerReportCompany(req, res) {
        try {
            let startingDate = new Date(req.body.startingDate)
            const endingDate = new Date(req.body.endingDate)
            endingDate.setDate(endingDate.getDate() + 1)
            const decoded_id = await decode(req.query.x_auth);
            const findUser = await staffModel.findById(decoded_id);
            if (!findUser) {
                let result = makeApiResponce('Unauthorized Attempt', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            if (findUser.accountType != "supervisor") {
                let result = makeApiResponce('Only supervisor can call this API', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            if (startingDate >= endingDate) {
                let result = makeApiResponce('Starting date must not to greater than or equal to ending date', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }

            let customerList = await staffModel.aggregate([
                { $match: { accountType: 'customer', company: findUser.company } },

                {
                    $lookup: {
                        from: 'qrsingles',
                        localField: '_id',
                        foreignField: 'customerID',
                        as: 'totalAmount',
                        pipeline: [
                            { $match: { clientID: findUser.company, ScannedByCustomer: true, ScannedByTeller: true, createdAt: { $gte: startingDate, $lte: endingDate } } },
                            {
                                $group: {
                                    _id: "totalAmount",
                                    total: { $sum: "$total.value" }
                                }
                            }
                        ]
                    }
                },
                {
                    $project: {
                        name: 1,
                        email: 1,
                        total: { $cond: { if: { $size: "$totalAmount" }, then: '$totalAmount.total', else: 0 } },
                    }
                }
            ])
            let totalAmountDeposited = await qrSingleMdel.aggregate([
                { $match: { clientID: findUser.company, ScannedByCustomer: true, ScannedByTeller: true, createdAt: { $gte: startingDate, $lte: endingDate } } },
                {
                    $group: {
                        _id: "totalAmount",
                        total: { $sum: "$total.value" }
                    }
                }
            ])
            const csvWriter = createCsvWriter({
                path: `reports/Total_Deposit_per_Customer_report_company_${findUser._id}.csv`,
                headerColor: 'red',
                header: [
                    { id: 'name', title: 'Customer Name' },
                    { id: 'email', title: 'Customer Email' },
                    { id: 'total', title: 'Total Amount ($)' },
                ]
            });
            let headers = ['Sr.', 'Name', 'Email', 'Total Amount ($)']
            let title = "Total Deposit Per Customer Report"
            let myHeader = [
                {
                    name: '',
                    email: '',
                    total: `Total = ${totalAmountDeposited.length > 0 ? totalAmountDeposited[0].total : 0}`,
                }
            ]
            csvWriter
                .writeRecords(myHeader.concat(customerList).reverse())
            let table = `
                <p style="text-align:center;">${req.body.startingDate} - ${req.body.endingDate}<span style="font-weight:bold;font-size:24px;margin-left:50px;margin-right:50px;">${title}</span>Total Deposit: ${totalAmountDeposited.length > 0 ? totalAmountDeposited[0].total : 0}</p>
                `
            table += "<table border='1' style='width:100%;word-break:break-word;'>";
            table += "<tr>";
            headers.map(item => {
                table += `<th >${item}</th>`;
            })
            table += "</tr>";

            customerList.reverse().forEach(function (row, index) {
                table += "<tr>";
                table += "<td style='text-align:left;'>" + (index + 1) + "</td>";
                table += "<td>" + row.name + "</td>";
                table += "<td>" + row.email + "</td>";
                table += "<td style='text-align:center;'>" + row.total + "</td>";
                table += "</tr>";
            });
            table += "</table>";

            var options = {
                "format": "A4",
                "orientation": "landscape",
                "border": {
                    "top": "0.1in",
                },
                "timeout": "120000"
            };
            pdf.create(table, options).toFile(`reports/Total_Deposit_per_Customer_report_company_${findUser._id}.pdf`, function (err, result) {
                if (err) {
                    throw (err)
                } else {
                    let userResponce = {
                        length: customerList.length,
                        downloadPDF: `${basr_url}/reports/Total_Deposit_per_Customer_report_company_${findUser._id}.pdf`,
                        downloadCSV: `${basr_url}/reports/Total_Deposit_per_Customer_report_company_${findUser._id}.csv`
                    }
                    let result = makeApiResponce(`Total customers report generated`, 1, OK, userResponce);
                    return res.json(result);
                }
            })
        } catch (err) {
            console.log(err)
            let result = makeApiResponce(err, 0, INTERNAL_SERVER_ERROR);
            return res.status(INTERNAL_SERVER_ERROR).json(result)
        }
    },
    async TotalBagsProcessedPerCustomerReportCompany(req, res) {
        try {
            let startingDate = new Date(req.body.startingDate)
            const endingDate = new Date(req.body.endingDate)
            endingDate.setDate(endingDate.getDate() + 1)
            const decoded_id = await decode(req.query.x_auth);
            const findUser = await staffModel.findById(decoded_id);
            if (!findUser) {
                let result = makeApiResponce('Unauthorized Attempt', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            if (findUser.accountType != "supervisor") {
                let result = makeApiResponce('Only supervisor can call this API', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            if (startingDate >= endingDate) {
                let result = makeApiResponce('Starting date must not to greater than or equal to ending date', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            let totalBags = await staffModel.aggregate([
                { $match: { accountType: 'customer', company: findUser.company } },

                {
                    $lookup: {
                        from: 'qrsingles',
                        localField: '_id',
                        foreignField: 'customerID',
                        as: 'totalAmount',
                        pipeline: [
                            { $match: { clientID: findUser.company, ScannedByCustomer: true, ScannedByTeller: true, createdAt: { $gte: startingDate, $lte: endingDate } } },
                            {
                                $group: {
                                    _id: "totalAmount",
                                    total: { $sum: 1 }
                                }
                            }
                        ]
                    }
                },
                {
                    $project: {
                        name: 1,
                        email: 1,
                        total: { $cond: { if: { $size: "$totalAmount" }, then: '$totalAmount.total', else: 0 } },
                    }
                }
            ])
            let totalBagsProcessed = await qrSingleMdel.find({ clientID: findUser.company, ScannedByCustomer: true, ScannedByTeller: true, createdAt: { $gte: startingDate, $lte: endingDate } })
            const csvWriter = createCsvWriter({
                path: `reports/Total_Bags_Processed_Per_Customer_company_${findUser._id}.csv`,
                headerColor: 'red',
                header: [
                    { id: 'name', title: 'Customer Name' },
                    { id: 'email', title: 'Customer Email' },
                    { id: 'total', title: 'Total bags processed' },
                ]
            });
            let headers = ['Sr.', 'Name', 'Email', 'Total bags processed']
            let title = "Total Bags Processed Report"
            let myHeader = [
                {
                    name: '',
                    email: '',
                    total: `Total = ${totalBagsProcessed.length > 0 ? totalBagsProcessed.length : 0}`,
                }
            ]
            csvWriter
                .writeRecords(myHeader.concat(totalBags).reverse())
                .then(
                    () => {
                        // console.log('CSV file created successfully.')
                    }
                );
            let table = `
        <p style="text-align:center;">${req.body.startingDate} - ${req.body.endingDate}<span style="font-weight:bold;font-size:24px;margin-left:50px;margin-right:50px;">${title}</span>Total Bags Processed : ${totalBagsProcessed.length > 0 ? totalBagsProcessed.length : 0}</p>
        `
            table += "<table border='1' style='width:100%;word-break:break-word;'>";
            table += "<tr>";
            headers.map(item => {
                table += `<th >${item}</th>`;
            })
            table += "</tr>";

            totalBags.reverse().forEach(function (row, index) {
                table += "<tr>";
                table += "<td style='text-align:left;'>" + (index + 1) + "</td>";
                table += "<td style='text-align:left;'>" + row.name + "</td>";
                table += "<td style='text-align:left;'>" + row.email + "</td>";
                table += "<td style='text-align:right;'>" + row.total + "</td>";
                table += "</tr>";
            });
            table += "</table>";

            var options = {
                "format": "A4",
                "orientation": "landscape",
                "border": {
                    "top": "0.1in",
                },
                "timeout": "120000"
            };
            pdf.create(table, options).toFile(`reports/Total_Bags_Processed_Per_Customer_company_${findUser._id}.pdf`, function (err, result) {
                if (err) {
                    throw (err)
                } else {
                    console.log("pdf created")
                    let userResponce = {
                        length: totalBags.length,
                        downloadPDF: `${basr_url}/reports/Total_Bags_Processed_Per_Customer_company_${findUser._id}.pdf`,
                        downloadCSV: `${basr_url}/reports/Total_Bags_Processed_Per_Customer_company_${findUser._id}.csv`
                    }
                    let result = makeApiResponce(`Total deposits report generated`, 1, OK, userResponce);
                    return res.json(result);
                }
            })
        } catch (err) {
            console.log(err)
            let result = makeApiResponce(err, 0, INTERNAL_SERVER_ERROR);
            return res.status(INTERNAL_SERVER_ERROR).json(result)
        }
    },
    async TotalBagsProcessedReportCompany(req, res) {
        try {
            let startingDate = new Date(req.body.startingDate)
            const endingDate = new Date(req.body.endingDate)
            endingDate.setDate(endingDate.getDate() + 1)
            const decoded_id = await decode(req.query.x_auth);
            const findUser = await staffModel.findById(decoded_id);
            if (!findUser) {
                let result = makeApiResponce('Unauthorized Attempt', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            if (findUser.accountType != "supervisor") {
                let result = makeApiResponce('Only supervisor can call this API', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            if (startingDate >= endingDate) {
                let result = makeApiResponce('Starting date must not to greater than or equal to ending date', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            let totalBags = await qrSingleMdel.aggregate([
                { $match: { clientID: findUser.company, ScannedByCustomer: true, ScannedByTeller: true, createdAt: { $gte: startingDate, $lte: endingDate } } },
                {
                    $lookup: {
                        from: "staffs",
                        localField: "customerID",
                        foreignField: "_id",
                        as: 'customerDetails'
                    }
                },
                {
                    $lookup: {
                        from: "staffs",
                        localField: "tellerID",
                        foreignField: "_id",
                        as: 'tellerDetails'
                    }
                },
                {
                    $addFields: {
                        email: '$customerDetails.email',
                        grandTotal: '$total.value',
                    }
                },
                {
                    $project: {
                        email: { $arrayElemAt: ["$customerDetails.email", 0] },
                        _id: 0,
                        bagID: 1,
                        grandTotal: 1,
                        tellerEmail: { $arrayElemAt: ["$tellerDetails.email", 0] },
                        createdAt: 1,
                        updatedAt: 1,
                        dateCreated: { $dateToString: { format: "%Y-%m-%d / %H:%M:%S", date: "$createdAt" } },
                        dateUpdated: { $dateToString: { format: "%Y-%m-%d / %H:%M:%S", date: "$updatedAt" } }
                    },
                },
            ])
            let totalBagsProcessed = await qrSingleMdel.find({ clientID: findUser.company, ScannedByCustomer: true, ScannedByTeller: true, createdAt: { $gte: startingDate, $lte: endingDate } })
            let totalAmountDeposited = await qrSingleMdel.aggregate([
                { $match: { clientID: findUser.company, ScannedByCustomer: true, ScannedByTeller: true, createdAt: { $gte: startingDate, $lte: endingDate } } },
                {
                    $group: {
                        _id: "totalAmount",
                        total: { $sum: "$total.value" }
                    }
                }
            ])
            const csvWriter = createCsvWriter({
                path: `reports/Total_Bags_Processed_company_${findUser._id}.csv`,
                header: [
                    { id: 'email', title: 'Customer Email' },
                    { id: 'bagID', title: 'BagID' },
                    { id: 'grandTotal', title: 'Amount ($)' },
                    { id: 'tellerEmail', title: 'Verifier Email' },
                    { id: 'dateCreated', title: 'Created At' },
                    { id: 'dateUpdated', title: 'Verified At' },
                ]
            });
            let headers = ['Sr.', 'Email', 'BagID', 'Amount ($)', 'Verifier Email', 'Created At', 'Updated At']
            let title = "Total Bags Processed Report"
            let myHeader = [
                {
                    bagID: '',
                    email: '',
                    grandTotal: `${totalAmountDeposited.length > 0 ? totalAmountDeposited[0].total : 0}`,
                    dateCreated: '',
                    dateUpdated: `Total = ${totalBagsProcessed.length}`,
                }
            ]
            csvWriter
                .writeRecords(myHeader.concat(totalBags).reverse())
                .then(
                    () => {
                        // console.log('CSV file created successfully.')
                    }
                );
            let table = `
        <p style="text-align:center;">${req.body.startingDate} - ${req.body.endingDate}<span style="font-weight:bold;font-size:24px;margin-left:50px;margin-right:50px;">${title}</span>Total Bags Processed : ${totalBagsProcessed.length > 0 ? totalBagsProcessed.length : 0}</p>
        `
            table += "<table border='1' style='width:100%;word-break:break-word;'>";
            table += "<tr>";
            headers.map(item => {
                table += `<th >${item}</th>`;
            })
            table += "</tr>";

            totalBags.reverse().forEach(function (row, index) {
                table += "<tr>";
                table += "<td style='text-align:left;'>" + (index + 1) + "</td>";
                table += "<td style='text-align:left;'>" + row.email + "</td>";
                table += "<td style='text-align:left;'>" + row.bagID + "</td>";
                table += "<td style='text-align:right;'>" + row.grandTotal + "</td>";
                table += "<td style='text-align:left;'>" + row.tellerEmail + "</td>";
                table += "<td style='text-align:right;'>" + row.dateCreated + "</td>";
                table += "<td style='text-align:right;'>" + row.dateUpdated + "</td>";
                table += "</tr>";
            });
            table += "</table>";

            var options = {
                "format": "A4",
                "orientation": "landscape",
                "border": {
                    "top": "0.1in",
                },
                "timeout": "120000"
            };
            pdf.create(table, options).toFile(`reports/Total_Bags_Processed_company_${findUser._id}.pdf`, function (err, result) {
                if (err) {
                    throw (err)
                } else {
                    console.log("pdf created")
                    let userResponce = {
                        length: totalBags.length,
                        downloadPDF: `${basr_url}/reports/Total_Bags_Processed_company_${findUser._id}.pdf`,
                        downloadCSV: `${basr_url}/reports/Total_Bags_Processed_company_${findUser._id}.csv`
                    }
                    let result = makeApiResponce(`Total deposits report generated`, 1, OK, userResponce);
                    return res.json(result);
                }
            })
        } catch (err) {
            console.log(err)
            let result = makeApiResponce(err, 0, INTERNAL_SERVER_ERROR);
            return res.status(INTERNAL_SERVER_ERROR).json(result)
        }
    },
    async TotalBagsProcessedReportTeller(req, res) {
        try {
            let startingDate = new Date(req.body.startingDate)
            const endingDate = new Date(req.body.endingDate)
            endingDate.setDate(endingDate.getDate() + 1)
            const decoded_id = await decode(req.query.x_auth);
            const findUser = await staffModel.findById(decoded_id);
            if (!findUser) {
                let result = makeApiResponce('Unauthorized Attempt', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            if (findUser.accountType != "teller" && findUser.accountType != "supervisor") {
                let result = makeApiResponce('Customers cannot call this API', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            if (startingDate >= endingDate) {
                let result = makeApiResponce('Starting date must not to greater than or equal to ending date', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            let totalBags = await qrSingleMdel.aggregate([
                { $match: { tellerID: findUser._id, clientID: findUser.company, ScannedByCustomer: true, ScannedByTeller: true, createdAt: { $gte: startingDate, $lte: endingDate } } },
                {
                    $lookup: {
                        from: "staffs",
                        localField: "customerID",
                        foreignField: "_id",
                        as: 'customerDetails'
                    }
                },
                {
                    $addFields: {
                        email: '$customerDetails.email',
                        grandTotal: '$total.value',
                    }
                },
                {
                    $project: {
                        email: { $arrayElemAt: ["$customerDetails.email", 0] },
                        _id: 0,
                        bagID: 1,
                        grandTotal: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        dateCreated: { $dateToString: { format: "%Y-%m-%d / %H:%M:%S", date: "$createdAt" } },
                        dateUpdated: { $dateToString: { format: "%Y-%m-%d / %H:%M:%S", date: "$updatedAt" } }
                    },
                },
            ])
            let totalAmountDeposited = await qrSingleMdel.aggregate([
                { $match: { tellerID: findUser._id, clientID: findUser.company, ScannedByCustomer: true, ScannedByTeller: true, createdAt: { $gte: startingDate, $lte: endingDate } } },
                {
                    $group: {
                        _id: "totalAmount",
                        total: { $sum: "$total.value" }
                    }
                }
            ])
            let totalBagsProcessed = await qrSingleMdel.find({ tellerID: findUser._id, clientID: findUser.company, ScannedByCustomer: true, ScannedByTeller: true, createdAt: { $gte: startingDate, $lte: endingDate } })
            const csvWriter = createCsvWriter({
                path: `reports/Total_Bags_Processed_Teller_company_${findUser._id}.csv`,
                header: [
                    { id: 'email', title: 'Customer Email' },
                    { id: 'bagID', title: 'BagID' },
                    { id: 'grandTotal', title: 'Amount ($)' },
                    { id: 'dateCreated', title: 'Created At' },
                    { id: 'dateUpdated', title: 'Verified At' },
                ]
            });
            let headers = ['Sr.', 'Email', 'BagID', 'Amount ($)', 'Created At', 'Verified At']
            let title = "Total Bags Processed Report"
            let myHeader = [
                {
                    bagID: '',
                    email: '',
                    grandTotal: `${totalAmountDeposited.length > 0 ? totalAmountDeposited[0].total : 0}`,
                    dateCreated: '',
                    dateUpdated: `Total = ${totalBagsProcessed.length}`,
                }
            ]
            csvWriter
                .writeRecords(myHeader.concat(totalBags).reverse())
                .then(
                    () => {
                        // console.log('CSV file created successfully.')
                    }
                );
            let table = `
        <p style="text-align:center;">${req.body.startingDate} - ${req.body.endingDate}<span style="font-weight:bold;font-size:24px;margin-left:50px;margin-right:50px;">${title}</span>Total Bags Processed : ${totalBagsProcessed.length > 0 ? totalBagsProcessed.length : 0}</p>
        `
            table += "<table border='1' style='width:100%;word-break:break-word;'>";
            table += "<tr>";
            headers.map(item => {
                table += `<th >${item}</th>`;
            })
            table += "</tr>";

            totalBags.reverse().forEach(function (row, index) {
                table += "<tr>";
                table += "<td style='text-align:left;'>" + (index + 1) + "</td>";
                table += "<td style='text-align:left;'>" + row.email + "</td>";
                table += "<td style='text-align:left;'>" + row.bagID + "</td>";
                table += "<td style='text-align:right;'>" + row.grandTotal + "</td>";
                table += "<td style='text-align:right;'>" + row.dateCreated + "</td>";
                table += "<td style='text-align:right;'>" + row.dateUpdated + "</td>";
                table += "</tr>";
            });
            table += "</table>";

            var options = {
                "format": "A4",
                "orientation": "landscape",
                "border": {
                    "top": "0.1in",
                },
                "timeout": "120000"
            };
            pdf.create(table, options).toFile(`reports/Total_Bags_Processed_Teller_company_${findUser._id}.pdf`, function (err, result) {
                if (err) {
                    throw (err)
                } else {
                    console.log("pdf created")
                    let userResponce = {
                        length: totalBags.length,
                        downloadPDF: `${basr_url}/reports/Total_Bags_Processed_Teller_company_${findUser._id}.pdf`,
                        downloadCSV: `${basr_url}/reports/Total_Bags_Processed_Teller_company_${findUser._id}.csv`
                    }
                    let result = makeApiResponce(`Total deposits report generated`, 1, OK, userResponce);
                    return res.json(result);
                }
            })
        } catch (err) {
            console.log(err)
            let result = makeApiResponce(err, 0, INTERNAL_SERVER_ERROR);
            return res.status(INTERNAL_SERVER_ERROR).json(result)
        }
    },
    async TotalDepositsReportLocalCompany(req, res) {
        try {
            let startingDate = new Date(req.body.startingDate)
            const endingDate = new Date(req.body.endingDate)
            endingDate.setDate(endingDate.getDate() + 1)
            const decoded_id = await decode(req.query.x_auth);
            const findUser = await staffModel.findById(decoded_id);
            if (!findUser) {
                let result = makeApiResponce('Unauthorized Attempt', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            if (findUser.accountType != "supervisor") {
                let result = makeApiResponce('Only supervisor can call this API', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            if (startingDate >= endingDate) {
                let result = makeApiResponce('Starting date must not to greater than or equal to ending date', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            let totalDeposits = await qrSingleMdel.aggregate([
                { $match: { clientID: findUser.company, ScannedByCustomer: true, ScannedByTeller: true, createdAt: { $gte: startingDate, $lte: endingDate } } },
                {
                    $lookup: {
                        from: "staffs",
                        localField: "customerID",
                        foreignField: "_id",
                        as: 'customerDetails'
                    }
                },
                {
                    $lookup: {
                        from: "staffs",
                        localField: "tellerID",
                        foreignField: "_id",
                        as: 'tellerDetails'
                    }
                },
                {
                    $addFields: {
                        name: '$customerDetails.name',
                        email: '$customerDetails.email',
                        totalInLocal: { $sum: '$Xcd.value' },
                        totalInFX: { $sum: '$FX.EQV' },
                        totalInChecks: { $sum: '$checks.checkAmount' },
                        grandTotal: '$total.value',
                    }
                },
                {
                    $project: {
                        _id: 1,
                        name: { $arrayElemAt: ["$customerDetails.name", 0] },
                        email: { $arrayElemAt: ["$customerDetails.email", 0] },
                        totalInLocal: 1,
                        totalInFX: 1,
                        totalInChecks: 1,
                        grandTotal: 1,
                        tellerName: { $arrayElemAt: ["$tellerDetails.name", 0] },
                        tellerEmail: { $arrayElemAt: ["$tellerDetails.email", 0] },
                        createdAt: 1,
                        updatedAt: 1,
                        dateCreated: { $dateToString: { format: "%Y-%m-%d / %H:%M:%S", date: "$createdAt" } },
                        dateUpdated: { $dateToString: { format: "%Y-%m-%d / %H:%M:%S", date: "$updatedAt" } },
                        array: {
                            $arrayToObject: {
                                $map: {
                                    input: '$Xcd',
                                    as: 'item',
                                    in: {
                                        k: '$$item.name',
                                        v: '$$item.value'
                                    }
                                }
                            }
                        }
                    }
                },
                {
                    $replaceRoot: {
                        newRoot: {
                            $mergeObjects: [
                                '$array',
                                { name: '$name', email: '$email', totalInLocal: '$totalInLocal', grandTotal: '$grandTotal', tellerName: '$tellerName', tellerEmail: '$tellerEmail', dateCreated: '$dateCreated', dateUpdated: '$dateUpdated', totalInChecks: '$totalInChecks', totalInFX: '$totalInFX' }
                            ]
                        }
                    }
                },
                {
                    $project: {
                        name: 1,
                        email: 1,
                        totalInLocal: 1,
                        totalInFX: 1,
                        totalInChecks: 1,
                        grandTotal: 1,
                        tellerName: 1,
                        tellerEmail: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        dateCreated: 1,
                        dateUpdated: 1,
                        X100: { $cond: { if: '$X100', then: '$X100', else: '0' } },
                        X50: { $cond: { if: '$X50', then: '$X50', else: '0' } },
                        X20: { $cond: { if: '$X20', then: '$X20', else: '0' } },
                        X5: { $cond: { if: '$X5', then: '$X5', else: '0' } },
                        Coins$1: { $cond: { if: '$Coins$1', then: '$Coins$1', else: '0' } },
                        Coins: { $cond: { if: '$Coins', then: '$Coins', else: '0' } },
                    }
                }
            ])
            let totalAmountDeposited = await qrSingleMdel.aggregate([
                { $match: { clientID: findUser.company, ScannedByCustomer: true, ScannedByTeller: true, createdAt: { $gte: startingDate, $lte: endingDate } } },
                {
                    $group: {
                        _id: "totalAmount",
                        total: { $sum: "$total.value" }
                    }
                }
            ])
            let totalAmountDepositedLocal = 0
            totalDeposits.map(item => {
                totalAmountDepositedLocal = totalAmountDepositedLocal + item.totalInLocal
            })
            const csvWriter = createCsvWriter({
                path: `reports/Total_deposits_Local_report_company_${findUser._id}.csv`,
                header: [
                    { id: 'name', title: 'Customer Name' },
                    { id: 'email', title: 'Customer Email' },
                    { id: 'totalInLocal', title: 'Amount (Local currency)' },
                    { id: 'X100', title: 'Amount (X100)' },
                    { id: 'X50', title: 'Amount (X50)' },
                    { id: 'X20', title: 'Amount (X20)' },
                    { id: 'X5', title: 'Amount (X5)' },
                    { id: 'Coins$1', title: 'Amount (Coins$1)' },
                    { id: 'Coins', title: 'Amount (Coins)' },
                    { id: 'grandTotal', title: 'Total amount' },
                    { id: 'tellerName', title: 'Verifier Name' },
                    { id: 'tellerEmail', title: 'Verifier Email)' },
                    { id: 'dateCreated', title: 'Created At' },
                    { id: 'dateUpdated', title: 'Verified At' },
                ]
            });
            let headers = ['Sr.', 'Customer Name', 'Customer Email', 'Amount (Local currency)', 'Amount (X100)', 'Amount (X50)', 'Amount (X20)', 'Amount (X5)', 'Amount (Coins$1)', 'Amount (Coins)', 'Amount (Checks)', 'Amount (FX)', 'Total Amount', 'Verifier Name', 'Verifier Email', 'Created At', 'Verified At']
            let title = "Total Deposits Report in Local"
            let myHeader = [
                {
                    name: '',
                    email: '',
                    totalInLocal: totalAmountDepositedLocal,
                    dateCreated: '',
                    totalInFX: '',
                    totalInChecks: '',
                    grandTotal: `${totalAmountDeposited.length > 0 ? totalAmountDeposited[0].total : 0}`,
                    tellerName: '',
                    tellerEmail: '',
                    dateCreated: '',
                    dateUpdated: '',
                    X100: '',
                    X50: '',
                    X20: '',
                    X5: '',
                    Coins$1: '',
                    Coins: '',
                }
            ]
            csvWriter
                .writeRecords(myHeader.concat(totalDeposits).reverse())
            let table = `
                <p style="text-align:center;">${req.body.startingDate} - ${req.body.endingDate}<span style="font-weight:bold;font-size:24px;margin-left:50px;margin-right:50px;">${title}</span>Total amount (Local Currency) : $${totalAmountDepositedLocal}</p>
                `
            table += "<table border='1' style='width:100%;word-break:break-word;'>";
            table += "<tr>";
            headers.map(item => {
                table += `<th >${item}</th>`;
            })
            table += "</tr>";

            totalDeposits.reverse().forEach(function (row, index) {
                table += "<tr>";
                table += "<td style='text-align:left;'>" + (index + 1) + "</td>";
                table += "<td>" + row.name + "</td>";
                table += "<td>" + row.email + "</td>";
                table += "<td style='text-align:right;'>" + row.totalInLocal + "</td>";
                table += "<td style='text-align:right;'>" + row.X100 + "</td>";
                table += "<td style='text-align:right;'>" + row.X50 + "</td>";
                table += "<td style='text-align:right;'>" + row.X20 + "</td>";
                table += "<td style='text-align:right;'>" + row.X5 + "</td>";
                table += "<td style='text-align:right;'>" + row.Coins$1 + "</td>";
                table += "<td style='text-align:right;'>" + row.Coins + "</td>";
                table += "<td style='text-align:right;'>" + row.totalInChecks + "</td>";
                table += "<td style='text-align:right;'>" + row.totalInFX + "</td>";
                table += "<td style='text-align:right;'>" + row.grandTotal + "</td>";
                table += "<td style='text-align:left;'>" + row.tellerName + "</td>";
                table += "<td style='text-align:left;'>" + row.tellerEmail + "</td>";
                table += "<td style='text-align:center;'>" + row.dateCreated + "</td>";
                table += "<td style='text-align:center;'>" + row.dateUpdated + "</td>";
                table += "</tr>";
            });
            table += "</table>";

            var options = {
                "format": "A4",
                "orientation": "landscape",
                "border": {
                    "top": "0.1in",
                },
                "timeout": "120000"
            };
            pdf.create(table, options).toFile(`reports/Total_deposits_Local_report_company_${findUser._id}.pdf`, function (err, result) {
                if (err) {
                    throw (err)
                } else {
                    let userResponce = {
                        length: totalDeposits.length,
                        downloadPDF: `${basr_url}/reports/Total_deposits_Local_report_company_${findUser._id}.pdf`,
                        downloadCSV: `${basr_url}/reports/Total_deposits_Local_report_company_${findUser._id}.csv`
                    }
                    let result = makeApiResponce(`Total deposits report generated`, 1, OK, userResponce);
                    return res.json(result);
                }
            })
        } catch (err) {
            console.log(err)
            let result = makeApiResponce(err, 0, INTERNAL_SERVER_ERROR);
            return res.status(INTERNAL_SERVER_ERROR).json(result)
        }
    },
    async TotalDepositsReportFXCompany(req, res) {
        try {
            let startingDate = new Date(req.body.startingDate)
            const endingDate = new Date(req.body.endingDate)
            endingDate.setDate(endingDate.getDate() + 1)
            const decoded_id = await decode(req.query.x_auth);
            const findUser = await staffModel.findById(decoded_id);
            if (!findUser) {
                let result = makeApiResponce('Unauthorized Attempt', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            if (findUser.accountType != "supervisor") {
                let result = makeApiResponce('Only supervisor can call this API', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            if (startingDate >= endingDate) {
                let result = makeApiResponce('Starting date must not to greater than or equal to ending date', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            let totalDeposits = await qrSingleMdel.aggregate([
                { $match: { clientID: findUser.company, ScannedByCustomer: true, ScannedByTeller: true, createdAt: { $gte: startingDate, $lte: endingDate } } },
                {
                    $lookup: {
                        from: "staffs",
                        localField: "customerID",
                        foreignField: "_id",
                        as: 'customerDetails'
                    }
                },
                {
                    $lookup: {
                        from: "staffs",
                        localField: "tellerID",
                        foreignField: "_id",
                        as: 'tellerDetails'
                    }
                },
                {
                    $addFields: {
                        totalInLocal: { $sum: '$Xcd.value' },
                        totalInFX: { $sum: '$FX.EQV' },
                        totalInChecks: { $sum: '$checks.checkAmount' },
                        grandTotal: '$total.value',
                    }
                },
                {
                    $project: {
                        _id: 1,
                        name: { $arrayElemAt: ["$customerDetails.name", 0] },
                        email: { $arrayElemAt: ["$customerDetails.email", 0] },
                        totalInLocal: 1,
                        totalInFX: 1,
                        totalInChecks: 1,
                        grandTotal: 1,
                        tellerName: { $arrayElemAt: ["$tellerDetails.name", 0] },
                        tellerEmail: { $arrayElemAt: ["$tellerDetails.email", 0] },
                        createdAt: 1,
                        updatedAt: 1,
                        dateCreated: { $dateToString: { format: "%Y-%m-%d / %H:%M:%S", date: "$createdAt" } },
                        dateUpdated: { $dateToString: { format: "%Y-%m-%d / %H:%M:%S", date: "$updatedAt" } },
                        array: {
                            $arrayToObject: {
                                $map: {
                                    input: '$FX',
                                    as: 'item',
                                    in: {
                                        k: '$$item.name',
                                        v: '$$item.FXamount'
                                    }
                                }
                            }
                        }
                    }
                },
                {
                    $replaceRoot: {
                        newRoot: {
                            $mergeObjects: [
                                '$array',
                                { name: '$name', email: '$email', totalInLocal: '$totalInLocal', grandTotal: '$grandTotal', tellerName: '$tellerName', tellerEmail: '$tellerEmail', dateCreated: '$dateCreated', dateUpdated: '$dateUpdated', totalInChecks: '$totalInChecks', totalInFX: '$totalInFX' }
                            ]
                        }
                    }
                },
                {
                    $project: {
                        name: 1,
                        email: 1,
                        totalInLocal: 1,
                        totalInFX: 1,
                        totalInChecks: 1,
                        grandTotal: 1,
                        tellerName: 1,
                        tellerEmail: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        dateCreated: 1,
                        dateUpdated: 1,
                        USD: { $cond: { if: '$USD', then: '$USD', else: '0' } },
                        EUR: { $cond: { if: '$EUR', then: '$EUR', else: '0' } },
                        GBP: { $cond: { if: '$GBP', then: '$GBP', else: '0' } },
                        CAD: { $cond: { if: '$CAD', then: '$CAD', else: '0' } },
                        BDS: { $cond: { if: '$BDS', then: '$BDS', else: '0' } },
                        TTD: { $cond: { if: '$TTD', then: '$TTD', else: '0' } }
                    }
                }
            ])
            console.log(totalDeposits)
            let totalAmountDeposited = await qrSingleMdel.aggregate([
                { $match: { clientID: findUser.company, ScannedByCustomer: true, ScannedByTeller: true, createdAt: { $gte: startingDate, $lte: endingDate } } },
                {
                    $group: {
                        _id: "totalAmount",
                        total: { $sum: "$total.value" }
                    }
                }
            ])
            const csvWriter = createCsvWriter({
                path: `reports/Total_deposits_FX_report_company_${findUser._id}.csv`,
                header: [
                    { id: 'name', title: 'Customer Name' },
                    { id: 'email', title: 'Customer Email' },
                    { id: 'totalInLocal', title: 'Amount (Local currency)' },
                    { id: 'totalInFX', title: 'Amount (FX)' },
                    { id: 'USD', title: 'EQV (USD)' },
                    { id: 'GBP', title: 'EQV (GBP)' },
                    { id: 'EUR', title: 'EQV (EUR)' },
                    { id: 'CAD', title: 'EQV (CAD)' },
                    { id: 'BDS', title: 'EQV (BDS)' },
                    { id: 'TTD', title: 'EQV (TTD)' },
                    { id: 'totalInChecks', title: 'Amount (Checks)' },
                    { id: 'grandTotal', title: 'Total amount' },
                    { id: 'tellerName', title: 'Verifier Name' },
                    { id: 'tellerEmail', title: 'Verifier Email)' },
                    { id: 'dateCreated', title: 'Created At' },
                    { id: 'dateUpdated', title: 'Verified At' },
                ]
            });
            let headers = ['Sr.', 'Customer Name', 'Customer Email', 'Amount (Local currency)', 'Amount (FX)', 'EQV (USD)', 'EQV (GBP)', 'EQV (EUR)', 'EQV (CAD)', 'EQV (BDS)', 'EQV (TTD)', 'Amount (Checks)', 'Total Amount', 'Verifier Name', 'Verifier Email', 'Created At', 'Verified At']
            let title = "Total Deposits Report in FX"
            let totalAmountDepositedFX = 0
            totalDeposits.map(item => {
                totalAmountDepositedFX = totalAmountDepositedFX + item.totalInFX
            })
            let myHeader = [
                {
                    totalInLocal: totalAmountDepositedFX,
                    name: '',
                    tellerName: '',
                    tellerEmail: '',
                    email: '',
                    dateCreated: '',
                    totalInFX: '',
                    totalInChecks: '',
                    grandTotal: `${totalAmountDeposited.length > 0 ? totalAmountDeposited[0].total : 0}`,
                    dateCreated: '',
                    dateUpdated: '',
                    USD: '',
                    EUR: '',
                    GBP: '',
                    CAD: '',
                    BDS: '',
                    TTD: '',
                }
            ]
            csvWriter
                .writeRecords(myHeader.concat(totalDeposits).reverse())
            let table = `
                <p style="text-align:center;">${req.body.startingDate} - ${req.body.endingDate}<span style="font-weight:bold;font-size:24px;margin-left:50px;margin-right:50px;">${title}</span>Total amount (FX): $${totalAmountDepositedFX}</p>
                `
            table += "<table border='1' style='width:100%;word-break:break-word;'>";
            table += "<tr>";
            headers.map(item => {
                table += `<th >${item}</th>`;
            })
            table += "</tr>";

            totalDeposits.reverse().forEach(function (row, index) {
                table += "<tr>";
                table += "<td style='text-align:left;'>" + (index + 1) + "</td>";
                table += "<td>" + row.name + "</td>";
                table += "<td>" + row.email + "</td>";
                table += "<td style='text-align:right;'>" + row.totalInLocal + "</td>";
                table += "<td style='text-align:right;'>" + row.totalInFX + "</td>";
                table += "<td style='text-align:right;'>" + row.USD + "</td>";
                table += "<td style='text-align:right;'>" + row.GBP + "</td>";
                table += "<td style='text-align:right;'>" + row.EUR + "</td>";
                table += "<td style='text-align:right;'>" + row.CAD + "</td>";
                table += "<td style='text-align:right;'>" + row.BDS + "</td>";
                table += "<td style='text-align:right;'>" + row.TTD + "</td>";
                table += "<td style='text-align:right;'>" + row.totalInChecks + "</td>";
                table += "<td style='text-align:right;'>" + row.grandTotal + "</td>";
                table += "<td style='text-align:left;'>" + row.tellerName + "</td>";
                table += "<td style='text-align:left;'>" + row.tellerEmail + "</td>";
                table += "<td style='text-align:center;'>" + row.dateCreated + "</td>";
                table += "<td style='text-align:center;'>" + row.dateUpdated + "</td>";
                table += "</tr>";
            });
            table += "</table>";

            var options = {
                "format": "A4",
                "orientation": "landscape",
                "border": {
                    "top": "0.1in",
                },
                "timeout": "120000"
            };
            pdf.create(table, options).toFile(`reports/Total_deposits_FX_report_company_${findUser._id}.pdf`, function (err, result) {
                if (err) {
                    throw (err)
                } else {
                    let userResponce = {
                        length: totalDeposits.length,
                        downloadPDF: `${basr_url}/reports/Total_deposits_FX_report_company_${findUser._id}.pdf`,
                        downloadCSV: `${basr_url}/reports/Total_deposits_FX_report_company_${findUser._id}.csv`
                    }
                    let result = makeApiResponce(`Total deposits report generated`, 1, OK, userResponce);
                    return res.json(result);
                }
            })
        } catch (err) {
            console.log(err)
            let result = makeApiResponce(err, 0, INTERNAL_SERVER_ERROR);
            return res.status(INTERNAL_SERVER_ERROR).json(result)
        }
    },
    async TotalDepositsReportChecksCompany(req, res) {
        try {
            let startingDate = new Date(req.body.startingDate)
            const endingDate = new Date(req.body.endingDate)
            endingDate.setDate(endingDate.getDate() + 1)
            const decoded_id = await decode(req.query.x_auth);
            const findUser = await staffModel.findById(decoded_id);
            if (!findUser) {
                let result = makeApiResponce('Unauthorized Attempt', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            if (findUser.accountType != "supervisor") {
                let result = makeApiResponce('Only supervisor can call this API', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            if (startingDate >= endingDate) {
                let result = makeApiResponce('Starting date must not to greater than or equal to ending date', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            let totalDeposits = await qrSingleMdel.aggregate([
                { $match: { clientID: findUser.company, ScannedByCustomer: true, ScannedByTeller: true, createdAt: { $gte: startingDate, $lte: endingDate } } },
                {
                    $lookup: {
                        from: "staffs",
                        localField: "customerID",
                        foreignField: "_id",
                        as: 'customerDetails'
                    }
                },
                {
                    $lookup: {
                        from: "staffs",
                        localField: "tellerID",
                        foreignField: "_id",
                        as: 'tellerDetails'
                    }
                },
                {
                    $addFields: {
                        totalInLocal: { $sum: '$Xcd.value' },
                        totalInFX: { $sum: '$FX.EQV' },
                        totalInChecks: { $sum: '$checks.checkAmount' },
                        grandTotal: '$total.value',

                    }
                },
                {
                    $project: {
                        _id: 1,
                        name: { $arrayElemAt: ["$customerDetails.name", 0] },
                        email: { $arrayElemAt: ["$customerDetails.email", 0] },
                        totalInLocal: 1,
                        totalInFX: 1,
                        totalInChecks: 1,
                        grandTotal: 1,
                        tellerName: { $arrayElemAt: ["$tellerDetails.name", 0] },
                        tellerEmail: { $arrayElemAt: ["$tellerDetails.email", 0] },
                        createdAt: 1,
                        updatedAt: 1,
                        dateCreated: { $dateToString: { format: "%Y-%m-%d / %H:%M:%S", date: "$createdAt" } },
                        dateUpdated: { $dateToString: { format: "%Y-%m-%d / %H:%M:%S", date: "$updatedAt" } },
                        array: {
                            $arrayToObject: {
                                $map: {
                                    input: '$checks',
                                    as: 'item',
                                    in: {
                                        k: '$$item.index',
                                        v: { $concat: ["Check", { $toString: "$$item.checkNumber" }, ', Amount :$', { $toString: "$$item.checkAmount" }] }
                                    }
                                }
                            }
                        },

                    }
                },
                {
                    $replaceRoot: {
                        newRoot: {
                            $mergeObjects: [
                                '$array',
                                { name: '$name', email: '$email', totalInLocal: '$totalInLocal', grandTotal: '$grandTotal', tellerName: '$tellerName', tellerEmail: '$tellerEmail', dateCreated: '$dateCreated', dateUpdated: '$dateUpdated', totalInChecks: '$totalInChecks', totalInFX: '$totalInFX', totalChecks: '$totalChecks', CheckNo1: '$CheckNo1', CheckNo2: '$CheckNo2', CheckNo3: '$CheckNo3', CheckNo4: '$CheckNo4', CheckNo5: '$CheckNo5' }
                            ]
                        }
                    }
                },
                {
                    $project: {
                        name: 1,
                        email: 1,
                        totalInLocal: 1,
                        totalInFX: 1,
                        totalInChecks: 1,
                        grandTotal: 1,
                        tellerName: 1,
                        tellerEmail: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        dateCreated: 1,
                        dateUpdated: 1,
                        CheckNo1: { $cond: { if: '$CheckNo1', then: '$CheckNo1', else: '-' } },
                        CheckNo2: { $cond: { if: '$CheckNo2', then: '$CheckNo2', else: '-' } },
                        CheckNo3: { $cond: { if: '$CheckNo3', then: '$CheckNo3', else: '-' } },
                        CheckNo4: { $cond: { if: '$CheckNo4', then: '$CheckNo4', else: '-' } },
                        CheckNo5: { $cond: { if: '$CheckNo5', then: '$CheckNo5', else: '-' } },
                    }
                }
            ])
            console.log(totalDeposits)
            let totalAmountDeposited = await qrSingleMdel.aggregate([
                { $match: { clientID: findUser.company, ScannedByCustomer: true, ScannedByTeller: true, createdAt: { $gte: startingDate, $lte: endingDate } } },
                {
                    $group: {
                        _id: "totalAmount",
                        total: { $sum: "$total.value" }
                    }
                }
            ])

            const csvWriter = createCsvWriter({
                path: `reports/Total_deposits_checks_report_company_${findUser._id}.csv`,
                header: [
                    { id: 'name', title: 'Customer Name' },
                    { id: 'email', title: 'Customer Email' },
                    { id: 'totalInLocal', title: 'Amount (Local currency)' },
                    { id: 'totalInFX', title: 'Amount (FX)' },
                    { id: 'CheckNo1', title: 'Check#1' },
                    { id: 'CheckNo2', title: 'Check#2' },
                    { id: 'CheckNo3', title: 'Check#3' },
                    { id: 'CheckNo4', title: 'Check#4' },
                    { id: 'CheckNo5', title: 'Check#5' },
                    { id: 'totalInChecks', title: 'Amount (Checks)' },
                    { id: 'grandTotal', title: 'Total amount' },
                    { id: 'tellerName', title: 'Verifier Name' },
                    { id: 'tellerEmail', title: 'Verifier Email)' },
                    { id: 'dateCreated', title: 'Created At' },
                    { id: 'dateUpdated', title: 'Verified At' },
                ]
            });
            let headers = ['Sr.', 'Customer Name', 'Customer Email', 'Amount (Local currency)', 'Amount (FX)', 'Amount (Checks)', 'Check#1', 'Check#2', 'Check#3', 'Check#4', 'Check#5', 'Total Amount', 'Verifier Name', 'Verifier Email', 'Created At', 'Verified At']
            let title = "Total Deposits Report in Checks"
            let totalAmountDepositedChecks = 0
            totalDeposits.map(item => {
                totalAmountDepositedChecks = totalAmountDepositedChecks + item.totalInChecks
            })
            let myHeader = [
                {
                    totalInLocal: '',
                    name: '',
                    email: '',
                    tellerName: '',
                    tellerEmail: '',
                    dateCreated: '',
                    totalInFX: '',
                    totalInChecks: totalAmountDepositedChecks,
                    grandTotal: `${totalAmountDeposited.length > 0 ? totalAmountDeposited[0].total : 0}`,
                    dateCreated: '',
                    dateUpdated: '',
                    CheckNo1: '',
                    CheckNo2: '',
                    CheckNo3: '',
                    CheckNo4: '',
                    CheckNo5: '',
                }
            ]
            csvWriter
                .writeRecords(myHeader.concat(totalDeposits).reverse())
            let table = `
                <p style="text-align:center;">${req.body.startingDate} - ${req.body.endingDate}<span style="font-weight:bold;font-size:24px;margin-left:50px;margin-right:50px;">${title}</span>Total amount (Checks) : $${totalAmountDepositedChecks}</p>
                `
            table += "<table border='1' style='width:100%;word-break:break-word;'>";
            table += "<tr>";
            headers.map(item => {
                table += `<th >${item}</th>`;
            })
            table += "</tr>";

            totalDeposits.reverse().forEach(function (row, index) {
                table += "<tr>";
                table += "<td style='text-align:left;'>" + (index + 1) + "</td>";
                table += "<td>" + row.name + "</td>";
                table += "<td>" + row.email + "</td>";
                table += "<td style='text-align:right;'>" + row.totalInLocal + "</td>";
                table += "<td style='text-align:right;'>" + row.totalInFX + "</td>";
                table += "<td style='text-align:right;'>" + row.totalInChecks + "</td>";
                table += "<td style='text-align:center;'>" + row.CheckNo1 + "</td>";
                table += "<td style='text-align:center;'>" + row.CheckNo2 + "</td>";
                table += "<td style='text-align:cenetr;'>" + row.CheckNo3 + "</td>";
                table += "<td style='text-align:center;'>" + row.CheckNo4 + "</td>";
                table += "<td style='text-align:center;'>" + row.CheckNo5 + "</td>";
                table += "<td style='text-align:right;'>" + row.grandTotal + "</td>";
                table += "<td style='text-align:left;'>" + row.tellerName + "</td>";
                table += "<td style='text-align:left;'>" + row.tellerEmail + "</td>";
                table += "<td style='text-align:center;'>" + row.dateCreated + "</td>";
                table += "<td style='text-align:center;'>" + row.dateUpdated + "</td>";
                table += "</tr>";
            });
            table += "</table>";

            var options = {
                "format": "A4",
                "orientation": "landscape",
                "border": {
                    "top": "0.1in",
                },
                "timeout": "120000"
            };
            pdf.create(table, options).toFile(`reports/Total_deposits_checks_report_company_${findUser._id}.pdf`, function (err, result) {
                if (err) {
                    throw (err)
                } else {
                    let userResponce = {
                        length: totalDeposits.length,
                        downloadPDF: `${basr_url}/reports/Total_deposits_checks_report_company_${findUser._id}.pdf`,
                        downloadCSV: `${basr_url}/reports/Total_deposits_checks_report_company_${findUser._id}.csv`
                    }
                    let result = makeApiResponce(`Total deposits report generated`, 1, OK, userResponce);
                    return res.json(result);
                }
            })
        } catch (err) {
            console.log(err)
            let result = makeApiResponce(err, 0, INTERNAL_SERVER_ERROR);
            return res.status(INTERNAL_SERVER_ERROR).json(result)
        }
    },
    async TotalDepositsReportLocalTeller(req, res) {
        try {
            let startingDate = new Date(req.body.startingDate)
            const endingDate = new Date(req.body.endingDate)
            endingDate.setDate(endingDate.getDate() + 1)
            const decoded_id = await decode(req.query.x_auth);
            const findUser = await staffModel.findById(decoded_id);
            if (!findUser) {
                let result = makeApiResponce('Unauthorized Attempt', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            if (findUser.accountType === "customer") {
                let result = makeApiResponce('You cannot call this API', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            if (startingDate >= endingDate) {
                let result = makeApiResponce('Starting date must not to greater than or equal to ending date', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            let totalDeposits = await qrSingleMdel.aggregate([
                { $match: { tellerID: findUser._id, clientID: findUser.company, ScannedByCustomer: true, ScannedByTeller: true, createdAt: { $gte: startingDate, $lte: endingDate } } },
                {
                    $lookup: {
                        from: "staffs",
                        localField: "customerID",
                        foreignField: "_id",
                        as: 'customerDetails'
                    }
                },
                {
                    $addFields: {
                        totalInLocal: { $sum: '$Xcd.value' },
                        totalInFX: { $sum: '$FX.EQV' },
                        totalInChecks: { $sum: '$checks.checkAmount' },
                        grandTotal: '$total.value',
                    }
                },
                {
                    $project: {
                        _id: 1,
                        name: { $arrayElemAt: ["$customerDetails.name", 0] },
                        email: { $arrayElemAt: ["$customerDetails.email", 0] },
                        totalInLocal: 1,
                        totalInFX: 1,
                        totalInChecks: 1,
                        grandTotal: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        dateCreated: { $dateToString: { format: "%Y-%m-%d / %H:%M:%S", date: "$createdAt" } },
                        dateUpdated: { $dateToString: { format: "%Y-%m-%d / %H:%M:%S", date: "$updatedAt" } },
                        array: {
                            $arrayToObject: {
                                $map: {
                                    input: '$Xcd',
                                    as: 'item',
                                    in: {
                                        k: '$$item.name',
                                        v: '$$item.value'
                                    }
                                }
                            }
                        }
                    }
                },
                {
                    $replaceRoot: {
                        newRoot: {
                            $mergeObjects: [
                                '$array',
                                { name: '$name', email: '$email', totalInLocal: '$totalInLocal', grandTotal: '$grandTotal', dateCreated: '$dateCreated', dateUpdated: '$dateUpdated', totalInChecks: '$totalInChecks', totalInFX: '$totalInFX' }
                            ]
                        }
                    }
                },
                {
                    $project: {
                        name: 1,
                        email: 1,
                        totalInLocal: 1,
                        totalInFX: 1,
                        totalInChecks: 1,
                        grandTotal: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        dateCreated: 1,
                        dateUpdated: 1,
                        X100: { $cond: { if: '$X100', then: '$X100', else: '0' } },
                        X50: { $cond: { if: '$X50', then: '$X50', else: '0' } },
                        X20: { $cond: { if: '$X20', then: '$X20', else: '0' } },
                        X5: { $cond: { if: '$X5', then: '$X5', else: '0' } },
                        Coins$1: { $cond: { if: '$Coins$1', then: '$Coins$1', else: '0' } },
                        Coins: { $cond: { if: '$Coins', then: '$Coins', else: '0' } },
                    }
                }
            ])
            let totalAmountDeposited = await qrSingleMdel.aggregate([
                { $match: { tellerID: findUser._id, clientID: findUser.company, ScannedByCustomer: true, ScannedByTeller: true, createdAt: { $gte: startingDate, $lte: endingDate } } },
                {
                    $group: {
                        _id: "totalAmount",
                        total: { $sum: "$total.value" }
                    }
                }
            ])
            console.log(totalAmountDeposited)
            const csvWriter = createCsvWriter({
                path: `reports/Total_deposits_Local_teller_${findUser._id}.csv`,
                header: [
                    { id: 'name', title: 'Customer Name' },
                    { id: 'email', title: 'Customer Email' },
                    { id: 'totalInLocal', title: 'Amount (Local currency)' },
                    { id: 'X100', title: 'Amount (X100)' },
                    { id: 'X50', title: 'Amount (X50)' },
                    { id: 'X20', title: 'Amount (X20)' },
                    { id: 'X5', title: 'Amount (X5)' },
                    { id: 'Coins', title: 'Amount (Coins)' },
                    { id: 'grandTotal', title: 'Total amount' },
                    { id: 'dateCreated', title: 'Created At' },
                    { id: 'dateUpdated', title: 'Verified At' },
                ]
            });

            let headers = ['Sr.', 'Customer Name', 'Customer Email', 'Amount (Local currency)', 'Amount (X100)', 'Amount (X50)', 'Amount (X20)', 'Amount (X5)', 'Amount (Coins)', 'Amount (Checks)', 'Amount (FX)', 'Total Amount', 'Created At', 'Verified At']
            let title = "Total Deposits Report in Local"
            let totalAmountDepositedLocal = 0
            totalDeposits.map(item => {
                totalAmountDepositedLocal = totalAmountDepositedLocal + item.totalInLocal
            })
            let myHeader = [
                {
                    name: '',
                    email: '',
                    totalInLocal: totalAmountDepositedLocal,
                    dateCreated: '',
                    totalInFX: '',
                    totalInChecks: '',
                    grandTotal: `${totalAmountDeposited.length > 0 ? totalAmountDeposited[0].total : 0}`,
                    dateCreated: '',
                    dateUpdated: '',
                    X100: '',
                    X50: '',
                    X20: '',
                    X5: '',
                    Coins$1: '',
                    Coins: '',
                }
            ]
            csvWriter
                .writeRecords(myHeader.concat(totalDeposits).reverse())
            let table = `
                <p style="text-align:center;">${req.body.startingDate} - ${req.body.endingDate}<span style="font-weight:bold;font-size:24px;margin-left:50px;margin-right:50px;">${title}</span>Total amount (Local Currency): $${totalAmountDepositedLocal}</p>
                `
            table += "<table border='1' style='width:100%;word-break:break-word;'>";
            table += "<tr>";
            headers.map(item => {
                table += `<th >${item}</th>`;
            })
            table += "</tr>";

            totalDeposits.reverse().forEach(function (row, index) {
                table += "<tr>";
                table += "<td style='text-align:left;'>" + (index + 1) + "</td>";
                table += "<td>" + row.name + "</td>";
                table += "<td>" + row.email + "</td>";
                table += "<td style='text-align:right;'>" + row.totalInLocal + "</td>";
                table += "<td style='text-align:right;'>" + row.X100 + "</td>";
                table += "<td style='text-align:right;'>" + row.X50 + "</td>";
                table += "<td style='text-align:right;'>" + row.X20 + "</td>";
                table += "<td style='text-align:right;'>" + row.X5 + "</td>";
                table += "<td style='text-align:right;'>" + row.Coins + "</td>";
                table += "<td style='text-align:right;'>" + row.totalInChecks + "</td>";
                table += "<td style='text-align:right;'>" + row.totalInFX + "</td>";
                table += "<td style='text-align:right;'>" + row.grandTotal + "</td>";
                table += "<td style='text-align:center;'>" + row.dateCreated + "</td>";
                table += "<td style='text-align:center;'>" + row.dateUpdated + "</td>";
                table += "</tr>";
            });
            table += "</table>";

            var options = {
                "format": "A4",
                "orientation": "landscape",
                "border": {
                    "top": "0.1in",
                },
                "timeout": "120000"
            };
            pdf.create(table, options).toFile(`reports/Total_deposits_Local_teller_${findUser._id}.pdf`, function (err, result) {
                if (err) {
                    throw (err)
                } else {
                    let userResponce = {
                        length: totalDeposits.length,
                        downloadPDF: `${basr_url}/reports/Total_deposits_Local_teller_${findUser._id}.pdf`,
                        downloadCSV: `${basr_url}/reports/Total_deposits_Local_teller_${findUser._id}.csv`
                    }
                    let result = makeApiResponce(`Total deposits report generated`, 1, OK, userResponce);
                    return res.json(result);
                }
            })
        } catch (err) {
            console.log(err)
            let result = makeApiResponce(err, 0, INTERNAL_SERVER_ERROR);
            return res.status(INTERNAL_SERVER_ERROR).json(result)
        }
    },
    async TotalDepositsReportFXTeller(req, res) {
        try {
            let startingDate = new Date(req.body.startingDate)
            const endingDate = new Date(req.body.endingDate)
            endingDate.setDate(endingDate.getDate() + 1)
            const decoded_id = await decode(req.query.x_auth);
            const findUser = await staffModel.findById(decoded_id);
            if (!findUser) {
                let result = makeApiResponce('Unauthorized Attempt', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            if (findUser.accountType === "customer") {
                let result = makeApiResponce('You cannot call this API', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            if (startingDate >= endingDate) {
                let result = makeApiResponce('Starting date must not to greater than or equal to ending date', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            let totalDeposits = await qrSingleMdel.aggregate([
                { $match: { clientID: findUser.company, ScannedByCustomer: true, ScannedByTeller: true, createdAt: { $gte: startingDate, $lte: endingDate } } },
                {
                    $lookup: {
                        from: "staffs",
                        localField: "customerID",
                        foreignField: "_id",
                        as: 'customerDetails'
                    }
                },
                {
                    $addFields: {
                        totalInLocal: { $sum: '$Xcd.value' },
                        totalInFX: { $sum: '$FX.EQV' },
                        totalInChecks: { $sum: '$checks.checkAmount' },
                        grandTotal: '$total.value',
                    }
                },
                {
                    $project: {
                        _id: 1,
                        name: { $arrayElemAt: ["$customerDetails.name", 0] },
                        email: { $arrayElemAt: ["$customerDetails.email", 0] },
                        totalInLocal: 1,
                        totalInFX: 1,
                        totalInChecks: 1,
                        grandTotal: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        dateCreated: { $dateToString: { format: "%Y-%m-%d / %H:%M:%S", date: "$createdAt" } },
                        dateUpdated: { $dateToString: { format: "%Y-%m-%d / %H:%M:%S", date: "$updatedAt" } },
                        array: {
                            $arrayToObject: {
                                $map: {
                                    input: '$FX',
                                    as: 'item',
                                    in: {
                                        k: '$$item.name',
                                        v: '$$item.FXamount'
                                    }
                                }
                            }
                        }
                    }
                },
                {
                    $replaceRoot: {
                        newRoot: {
                            $mergeObjects: [
                                '$array',
                                { name: '$name', email: '$email', totalInLocal: '$totalInLocal', grandTotal: '$grandTotal', dateCreated: '$dateCreated', dateUpdated: '$dateUpdated', totalInChecks: '$totalInChecks', totalInFX: '$totalInFX' }
                            ]
                        }
                    }
                },
                {
                    $project: {
                        name: 1,
                        email: 1,
                        totalInLocal: 1,
                        totalInFX: 1,
                        totalInChecks: 1,
                        grandTotal: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        dateCreated: 1,
                        dateUpdated: 1,
                        USD: { $cond: { if: '$USD', then: '$USD', else: '0' } },
                        EUR: { $cond: { if: '$EUR', then: '$EUR', else: '0' } },
                        GBP: { $cond: { if: '$GBP', then: '$GBP', else: '0' } },
                        CAD: { $cond: { if: '$CAD', then: '$CAD', else: '0' } },
                        BDS: { $cond: { if: '$BDS', then: '$BDS', else: '0' } },
                        TTD: { $cond: { if: '$TTD', then: '$TTD', else: '0' } }
                    }
                }
            ])
            let totalAmountDeposited = await qrSingleMdel.aggregate([
                { $match: { tellerID: findUser._id, clientID: findUser.company, ScannedByCustomer: true, ScannedByTeller: true, createdAt: { $gte: startingDate, $lte: endingDate } } },
                {
                    $group: {
                        _id: "totalAmount",
                        total: { $sum: "$total.value" }
                    }
                }
            ])
            const csvWriter = createCsvWriter({
                path: `reports/Total_deposits_FX_teller_${findUser._id}.csv`,
                header: [
                    { id: 'name', title: 'Customer Name' },
                    { id: 'email', title: 'Customer Email' },
                    { id: 'totalInLocal', title: 'Amount (Local currency)' },
                    { id: 'USD', title: 'EQV (USD)' },
                    { id: 'GBP', title: 'EQV (GBP)' },
                    { id: 'EUR', title: 'EQV (EUR)' },
                    { id: 'CAD', title: 'EQV (CAD)' },
                    { id: 'BDS', title: 'EQV (BDS)' },
                    { id: 'TTD', title: 'EQV (TTD)' },
                    { id: 'Coins', title: 'Amount (Coins)' },
                    { id: 'grandTotal', title: 'Total amount' },
                    { id: 'dateCreated', title: 'Created At' },
                    { id: 'dateUpdated', title: 'Verified At' },
                ]
            });
            let headers = ['Sr.', 'Customer Name', 'Customer Email', 'Amount (Local currency)', 'Amount (FX)', 'EQV (USD)', 'EQV (GBP)', 'EQV (EUR)', 'EQV (CAD)', 'EQV (BDS)', 'EQV (TTD)', 'Amount (Checks)', 'Total Amount', 'Created At', 'Verified At']
            let title = "Total Deposits Report in FX"
            let totalAmountDepositedFX = 0
            totalDeposits.map(item => {
                totalAmountDepositedFX = totalAmountDepositedFX + item.totalInFX
            })
            let myHeader = [
                {
                    totalInLocal: totalAmountDepositedFX,
                    name: '',
                    email: '',
                    dateCreated: '',
                    totalInFX: '',
                    totalInChecks: '',
                    grandTotal: `${totalAmountDeposited.length > 0 ? totalAmountDeposited[0].total : 0}`,
                    dateCreated: '',
                    dateUpdated: '',
                    USD: '',
                    EUR: '',
                    GBP: '',
                    CAD: '',
                    BDS: '',
                    TTD: '',
                }
            ]
            csvWriter
                .writeRecords(myHeader.concat(totalDeposits).reverse())
            let table = `
                <p style="text-align:center;">${req.body.startingDate} - ${req.body.endingDate}<span style="font-weight:bold;font-size:24px;margin-left:50px;margin-right:50px;">${title}</span>Total amount (FX): $${totalAmountDepositedFX}</p>
                `
            table += "<table border='1' style='width:100%;word-break:break-word;'>";
            table += "<tr>";
            headers.map(item => {
                table += `<th >${item}</th>`;
            })
            table += "</tr>";

            totalDeposits.reverse().forEach(function (row, index) {
                table += "<tr>";
                table += "<td style='text-align:left;'>" + (index + 1) + "</td>";
                table += "<td>" + row.name + "</td>";
                table += "<td>" + row.email + "</td>";
                table += "<td style='text-align:right;'>" + row.totalInLocal + "</td>";
                table += "<td style='text-align:right;'>" + row.totalInFX + "</td>";
                table += "<td style='text-align:right;'>" + row.USD + "</td>";
                table += "<td style='text-align:right;'>" + row.GBP + "</td>";
                table += "<td style='text-align:right;'>" + row.EUR + "</td>";
                table += "<td style='text-align:right;'>" + row.CAD + "</td>";
                table += "<td style='text-align:right;'>" + row.BDS + "</td>";
                table += "<td style='text-align:right;'>" + row.TTD + "</td>";
                table += "<td style='text-align:right;'>" + row.totalInChecks + "</td>";
                table += "<td style='text-align:right;'>" + row.grandTotal + "</td>";
                table += "<td style='text-align:center;'>" + row.dateCreated + "</td>";
                table += "<td style='text-align:center;'>" + row.dateUpdated + "</td>";
                table += "</tr>";
            });
            table += "</table>";

            var options = {
                "format": "A4",
                "orientation": "landscape",
                "border": {
                    "top": "0.1in",
                },
                "timeout": "120000"
            };
            pdf.create(table, options).toFile(`reports/Total_deposits_FX_teller_${findUser._id}.pdf`, function (err, result) {
                if (err) {
                    throw (err)
                } else {
                    let userResponce = {
                        length: totalDeposits.length,
                        downloadPDF: `${basr_url}/reports/Total_deposits_FX_teller_${findUser._id}.pdf`,
                        downloadCSV: `${basr_url}/reports/Total_deposits_FX_teller_${findUser._id}.csv`
                    }
                    let result = makeApiResponce(`Total deposits report generated`, 1, OK, userResponce);
                    return res.json(result);
                }
            })
        } catch (err) {
            console.log(err)
            let result = makeApiResponce(err, 0, INTERNAL_SERVER_ERROR);
            return res.status(INTERNAL_SERVER_ERROR).json(result)
        }
    },
    async TotalDepositsReportChecksTeller(req, res) {
        try {
            let startingDate = new Date(req.body.startingDate)
            const endingDate = new Date(req.body.endingDate)
            endingDate.setDate(endingDate.getDate() + 1)
            const decoded_id = await decode(req.query.x_auth);
            const findUser = await staffModel.findById(decoded_id);
            if (!findUser) {
                let result = makeApiResponce('Unauthorized Attempt', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            if (findUser.accountType === "customer") {
                let result = makeApiResponce('You cannot call this API', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            if (startingDate >= endingDate) {
                let result = makeApiResponce('Starting date must not to greater than or equal to ending date', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            let totalDeposits = await qrSingleMdel.aggregate([
                { $match: { tellerID: findUser._id, clientID: findUser.company, ScannedByCustomer: true, ScannedByTeller: true, createdAt: { $gte: startingDate, $lte: endingDate } } },
                {
                    $lookup: {
                        from: "staffs",
                        localField: "customerID",
                        foreignField: "_id",
                        as: 'customerDetails'
                    }
                },
                {
                    $addFields: {
                        totalInLocal: { $sum: '$Xcd.value' },
                        totalInFX: { $sum: '$FX.EQV' },
                        totalInChecks: { $sum: '$checks.checkAmount' },
                        grandTotal: '$total.value',

                    }
                },
                {
                    $project: {
                        _id: 1,
                        name: { $arrayElemAt: ["$customerDetails.name", 0] },
                        email: { $arrayElemAt: ["$customerDetails.email", 0] },
                        totalInLocal: 1,
                        totalInFX: 1,
                        totalInChecks: 1,
                        grandTotal: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        dateCreated: { $dateToString: { format: "%Y-%m-%d / %H:%M:%S", date: "$createdAt" } },
                        dateUpdated: { $dateToString: { format: "%Y-%m-%d / %H:%M:%S", date: "$updatedAt" } },
                        array: {
                            $arrayToObject: {
                                $map: {
                                    input: '$checks',
                                    as: 'item',
                                    in: {
                                        k: '$$item.index',
                                        v: { $concat: ["Check", { $toString: "$$item.checkNumber" }, ', Amount :$', { $toString: "$$item.checkAmount" }] }
                                    }
                                }
                            }
                        },

                    }
                },
                {
                    $replaceRoot: {
                        newRoot: {
                            $mergeObjects: [
                                '$array',
                                { name: '$name', email: '$email', totalInLocal: '$totalInLocal', grandTotal: '$grandTotal', dateCreated: '$dateCreated', dateUpdated: '$dateUpdated', totalInChecks: '$totalInChecks', totalInFX: '$totalInFX', totalChecks: '$totalChecks', CheckNo1: '$CheckNo1', CheckNo2: '$CheckNo2', CheckNo3: '$CheckNo3', CheckNo4: '$CheckNo4', CheckNo5: '$CheckNo5' }
                            ]
                        }
                    }
                },
                {
                    $project: {
                        name: 1,
                        email: 1,
                        totalInLocal: 1,
                        totalInFX: 1,
                        totalInChecks: 1,
                        grandTotal: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        dateCreated: 1,
                        dateUpdated: 1,
                        CheckNo1: { $cond: { if: '$CheckNo1', then: '$CheckNo1', else: '-' } },
                        CheckNo2: { $cond: { if: '$CheckNo2', then: '$CheckNo2', else: '-' } },
                        CheckNo3: { $cond: { if: '$CheckNo3', then: '$CheckNo3', else: '-' } },
                        CheckNo4: { $cond: { if: '$CheckNo4', then: '$CheckNo4', else: '-' } },
                        CheckNo5: { $cond: { if: '$CheckNo5', then: '$CheckNo5', else: '-' } },
                    }
                }
            ])
            console.log(totalDeposits)
            let totalAmountDeposited = await qrSingleMdel.aggregate([
                { $match: { tellerID: findUser._id, clientID: findUser.company, ScannedByCustomer: true, ScannedByTeller: true, createdAt: { $gte: startingDate, $lte: endingDate } } },
                {
                    $group: {
                        _id: "totalAmount",
                        total: { $sum: "$total.value" }
                    }
                }
            ])

            const csvWriter = createCsvWriter({
                path: `reports/Total_deposits_checks_report_teller_${findUser._id}.csv`,
                header: [
                    { id: 'name', title: 'Customer Name' },
                    { id: 'email', title: 'Customer Email' },
                    { id: 'totalInLocal', title: 'Amount (Local currency)' },
                    { id: 'totalInFX', title: 'Amount (FX)' },
                    { id: 'CheckNo1', title: 'Check#1' },
                    { id: 'CheckNo2', title: 'Check#2' },
                    { id: 'CheckNo3', title: 'Check#3' },
                    { id: 'CheckNo4', title: 'Check#4' },
                    { id: 'CheckNo5', title: 'Check#5' },
                    { id: 'totalInChecks', title: 'Amount (Checks)' },
                    { id: 'grandTotal', title: 'Total amount' },
                    { id: 'dateCreated', title: 'Created At' },
                    { id: 'dateUpdated', title: 'Verified At' },
                ]
            });
            let headers = ['Sr.', 'Customer Name', 'Customer Email', 'Amount (Local currency)', 'Amount (FX)', 'Amount (Checks)', 'Check#1', 'Check#2', 'Check#3', 'Check#4', 'Check#5', 'Total Amount', 'Created At', 'Verified At']
            let title = "Total Deposits Report in Checks"
            let totalAmountDepositedChecks = 0
            totalDeposits.map(item => {
                totalAmountDepositedChecks = totalAmountDepositedChecks + item.totalInChecks
            })
            let myHeader = [
                {
                    totalInLocal: '',
                    name: '',
                    email: '',
                    dateCreated: '',
                    totalInFX: '',
                    totalInChecks: totalAmountDepositedChecks,
                    grandTotal: `${totalAmountDeposited.length > 0 ? totalAmountDeposited[0].total : 0}`,
                    dateCreated: '',
                    dateUpdated: '',
                    CheckNo1: '',
                    CheckNo2: '',
                    CheckNo3: '',
                    CheckNo4: '',
                    CheckNo5: '',
                }
            ]
            csvWriter
                .writeRecords(myHeader.concat(totalDeposits).reverse())
            let table = `
                <p style="text-align:center;">${req.body.startingDate} - ${req.body.endingDate}<span style="font-weight:bold;font-size:24px;margin-left:50px;margin-right:50px;">${title}</span>Total amount (Checks): $${totalAmountDepositedChecks}</p>
                `
            table += "<table border='1' style='width:100%;word-break:break-word;'>";
            table += "<tr>";
            headers.map(item => {
                table += `<th >${item}</th>`;
            })
            table += "</tr>";

            totalDeposits.reverse().forEach(function (row, index) {
                table += "<tr>";
                table += "<td style='text-align:left;'>" + (index + 1) + "</td>";
                table += "<td>" + row.name + "</td>";
                table += "<td>" + row.email + "</td>";
                table += "<td style='text-align:right;'>" + row.totalInLocal + "</td>";
                table += "<td style='text-align:right;'>" + row.totalInFX + "</td>";
                table += "<td style='text-align:right;'>" + row.totalInChecks + "</td>";
                table += "<td style='text-align:center;'>" + row.CheckNo1 + "</td>";
                table += "<td style='text-align:center;'>" + row.CheckNo2 + "</td>";
                table += "<td style='text-align:center;'>" + row.CheckNo3 + "</td>";
                table += "<td style='text-align:center;'>" + row.CheckNo4 + "</td>";
                table += "<td style='text-align:center;'>" + row.CheckNo5 + "</td>";
                table += "<td style='text-align:right;'>" + row.grandTotal + "</td>";
                table += "<td style='text-align:center;'>" + row.dateCreated + "</td>";
                table += "<td style='text-align:center;'>" + row.dateUpdated + "</td>";
                table += "</tr>";
            });
            table += "</table>";

            var options = {
                "format": "A4",
                "orientation": "landscape",
                "border": {
                    "top": "0.1in",
                },
                "timeout": "120000"
            };
            pdf.create(table, options).toFile(`reports/Total_deposits_checks_report_teller_${findUser._id}.pdf`, function (err, result) {
                if (err) {
                    throw (err)
                } else {
                    let userResponce = {
                        length: totalDeposits.length,
                        downloadPDF: `${basr_url}/reports/Total_deposits_checks_report_teller_${findUser._id}.pdf`,
                        downloadCSV: `${basr_url}/reports/Total_deposits_checks_report_teller_${findUser._id}.csv`
                    }
                    let result = makeApiResponce(`Total deposits report generated`, 1, OK, userResponce);
                    return res.json(result);
                }
            })
        } catch (err) {
            console.log(err)
            let result = makeApiResponce(err, 0, INTERNAL_SERVER_ERROR);
            return res.status(INTERNAL_SERVER_ERROR).json(result)
        }
    },
    async TotalDepositsReportLocalCustomer(req, res) {
        try {
            let startingDate = new Date(req.body.startingDate)
            const endingDate = new Date(req.body.endingDate)
            endingDate.setDate(endingDate.getDate() + 1)
            const decoded_id = await decode(req.query.x_auth);
            const findUser = await staffModel.findById(decoded_id);
            if (!findUser) {
                let result = makeApiResponce('Unauthorized Attempt', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            if (findUser.accountType != 'customer') {
                let result = makeApiResponce('You cannot call this API', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            if (startingDate >= endingDate) {
                let result = makeApiResponce('Starting date must not to greater than or equal to ending date', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            let totalDeposits = await qrSingleMdel.aggregate([
                { $match: { customerID: findUser._id, clientID: findUser.company, ScannedByCustomer: true, ScannedByTeller: true, createdAt: { $gte: startingDate, $lte: endingDate } } },
                {
                    $addFields: {
                        totalInLocal: { $sum: '$Xcd.value' },
                        totalInFX: { $sum: '$FX.EQV' },
                        totalInChecks: { $sum: '$checks.checkAmount' },
                        grandTotal: '$total.value',
                    }
                },
                {
                    $project: {
                        _id: 1,
                        totalInLocal: 1,
                        totalInFX: 1,
                        totalInChecks: 1,
                        grandTotal: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        dateCreated: { $dateToString: { format: "%Y-%m-%d / %H:%M:%S", date: "$createdAt" } },
                        dateUpdated: { $dateToString: { format: "%Y-%m-%d / %H:%M:%S", date: "$updatedAt" } },
                        array: {
                            $arrayToObject: {
                                $map: {
                                    input: '$Xcd',
                                    as: 'item',
                                    in: {
                                        k: '$$item.name',
                                        v: '$$item.value'
                                    }
                                }
                            }
                        }
                    }
                },
                {
                    $replaceRoot: {
                        newRoot: {
                            $mergeObjects: [
                                '$array',
                                { totalInLocal: '$totalInLocal', grandTotal: '$grandTotal', dateCreated: '$dateCreated', dateUpdated: '$dateUpdated', totalInChecks: '$totalInChecks', totalInFX: '$totalInFX' }
                            ]
                        }
                    }
                },
                {
                    $project: {
                        totalInLocal: 1,
                        totalInFX: 1,
                        totalInChecks: 1,
                        grandTotal: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        dateCreated: 1,
                        dateUpdated: 1,
                        X100: { $cond: { if: '$X100', then: '$X100', else: '0' } },
                        X50: { $cond: { if: '$X50', then: '$X50', else: '0' } },
                        X20: { $cond: { if: '$X20', then: '$X20', else: '0' } },
                        X5: { $cond: { if: '$X5', then: '$X5', else: '0' } },
                        Coins$1: { $cond: { if: '$Coins$1', then: '$Coins$1', else: '0' } },
                        Coins: { $cond: { if: '$Coins', then: '$Coins', else: '0' } },
                    }
                }
            ])
            let totalAmountDeposited = await qrSingleMdel.aggregate([
                { $match: { customerID: findUser._id, clientID: findUser.company, ScannedByCustomer: true, ScannedByTeller: true, createdAt: { $gte: startingDate, $lte: endingDate } } },
                {
                    $group: {
                        _id: "totalAmount",
                        total: { $sum: "$total.value" }
                    }
                }
            ])
            let totalAmountDepositedLocal = 0
            totalDeposits.map(item => {
                totalAmountDepositedLocal = totalAmountDepositedLocal + item.totalInLocal
            })
            let myHeader = [
                {
                    totalInLocal: totalAmountDepositedLocal,
                    dateCreated: '',
                    totalInFX: '',
                    totalInChecks: '',
                    grandTotal: `${totalAmountDeposited.length > 0 ? totalAmountDeposited[0].total : 0}`,
                    dateCreated: '',
                    dateUpdated: '',
                    X100: '',
                    X50: '',
                    X20: '',
                    X5: '',
                    Coins$1: '',
                    Coins: '',
                }
            ]
            const csvWriter = createCsvWriter({
                path: `reports/Total_deposits_Local_customer_${findUser._id}.csv`,
                header: [
                    { id: 'totalInLocal', title: 'Amount (Local currency)' },
                    { id: 'X100', title: 'Amount (X100)' },
                    { id: 'X50', title: 'Amount (X50)' },
                    { id: 'X20', title: 'Amount (X20)' },
                    { id: 'X5', title: 'Amount (X5)' },
                    { id: 'Coins', title: 'Amount (Coins)' },
                    { id: 'totalInFX', title: 'Amount (FX)' },
                    { id: 'totalInChecks', title: 'Amount (Checks' },
                    { id: 'grandTotal', title: 'Total amount' },
                    { id: 'dateCreated', title: 'Created At' },
                    { id: 'dateUpdated', title: 'Verified At' },
                ]
            });
            let headers = ['Sr.', 'Amount (Local currency)', 'Amount (X100)', 'Amount (X50)', 'Amount (X20)', 'Amount (X5)', 'Amount (Coins)', 'Amount (Checks)', 'Amount (FX)', 'Total Amount', 'Created At', 'Verified At']
            let title = "Total Deposits Report in Local"
            csvWriter
                .writeRecords(myHeader.concat(totalDeposits).reverse())
            let table = `
                <p style="text-align:center;">${req.body.startingDate} - ${req.body.endingDate}<span style="font-weight:bold;font-size:24px;margin-left:50px;margin-right:50px;">${title}</span>Total amount (Local Currency): $${totalAmountDepositedLocal}</p>
                `
            table += "<table border='1' style='width:100%;word-break:break-word;'>";
            table += "<tr>";
            headers.map(item => {
                table += `<th >${item}</th>`;
            })
            table += "</tr>";

            totalDeposits.reverse().forEach(function (row, index) {
                table += "<tr>";
                table += "<td style='text-align:left;'>" + (index + 1) + "</td>";
                table += "<td style='text-align:right;'>" + row.totalInLocal + "</td>";
                table += "<td style='text-align:right;'>" + row.X100 + "</td>";
                table += "<td style='text-align:right;'>" + row.X50 + "</td>";
                table += "<td style='text-align:right;'>" + row.X20 + "</td>";
                table += "<td style='text-align:right;'>" + row.X5 + "</td>";
                table += "<td style='text-align:right;'>" + row.Coins + "</td>";
                table += "<td style='text-align:right;'>" + row.totalInChecks + "</td>";
                table += "<td style='text-align:right;'>" + row.totalInFX + "</td>";
                table += "<td style='text-align:right;'>" + row.grandTotal + "</td>";
                table += "<td style='text-align:center;'>" + row.dateCreated + "</td>";
                table += "<td style='text-align:center;'>" + row.dateUpdated + "</td>";
                table += "</tr>";
            });
            table += "</table>";

            var options = {
                "format": "A4",
                "orientation": "landscape",
                "border": {
                    "top": "0.1in",
                },
                "timeout": "120000"
            };
            pdf.create(table, options).toFile(`reports/Total_deposits_Local_customer_${findUser._id}.pdf`, function (err, result) {
                if (err) {
                    throw (err)
                } else {
                    let userResponce = {
                        length: totalDeposits.length,
                        downloadPDF: `${basr_url}/reports/Total_deposits_Local_customer_${findUser._id}.pdf`,
                        downloadCSV: `${basr_url}/reports/Total_deposits_Local_customer_${findUser._id}.csv`
                    }
                    let result = makeApiResponce(`Total deposits report generated`, 1, OK, userResponce);
                    return res.json(result);
                }
            })
        } catch (err) {
            console.log(err)
            let result = makeApiResponce(err, 0, INTERNAL_SERVER_ERROR);
            return res.status(INTERNAL_SERVER_ERROR).json(result)
        }
    },
    async TotalDepositsReportFXCustomer(req, res) {
        try {
            let startingDate = new Date(req.body.startingDate)
            const endingDate = new Date(req.body.endingDate)
            endingDate.setDate(endingDate.getDate() + 1)
            const decoded_id = await decode(req.query.x_auth);
            const findUser = await staffModel.findById(decoded_id);
            if (!findUser) {
                let result = makeApiResponce('Unauthorized Attempt', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            if (findUser.accountType != 'customer') {
                let result = makeApiResponce('You cannot call this API', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            if (startingDate >= endingDate) {
                let result = makeApiResponce('Starting date must not to greater than or equal to ending date', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            let totalDeposits = await qrSingleMdel.aggregate([
                { $match: { customerID: findUser._id, clientID: findUser.company, ScannedByCustomer: true, ScannedByTeller: true, createdAt: { $gte: startingDate, $lte: endingDate } } },
                {
                    $addFields: {
                        totalInLocal: { $sum: '$Xcd.value' },
                        totalInFX: { $sum: '$FX.EQV' },
                        totalInChecks: { $sum: '$checks.checkAmount' },
                        grandTotal: '$total.value',
                    }
                },
                {
                    $project: {
                        _id: 1,
                        totalInLocal: 1,
                        totalInFX: 1,
                        totalInChecks: 1,
                        grandTotal: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        dateCreated: { $dateToString: { format: "%Y-%m-%d / %H:%M:%S", date: "$createdAt" } },
                        dateUpdated: { $dateToString: { format: "%Y-%m-%d / %H:%M:%S", date: "$updatedAt" } },
                        array: {
                            $arrayToObject: {
                                $map: {
                                    input: '$FX',
                                    as: 'item',
                                    in: {
                                        k: '$$item.name',
                                        v: '$$item.FXamount'
                                    }
                                }
                            }
                        }
                    }
                },
                {
                    $replaceRoot: {
                        newRoot: {
                            $mergeObjects: [
                                '$array',
                                { totalInLocal: '$totalInLocal', grandTotal: '$grandTotal', dateCreated: '$dateCreated', dateUpdated: '$dateUpdated', totalInChecks: '$totalInChecks', totalInFX: '$totalInFX' }
                            ]
                        }
                    }
                },
                {
                    $project: {
                        totalInLocal: 1,
                        totalInFX: 1,
                        totalInChecks: 1,
                        grandTotal: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        dateCreated: 1,
                        dateUpdated: 1,
                        USD: { $cond: { if: '$USD', then: '$USD', else: '0' } },
                        EUR: { $cond: { if: '$EUR', then: '$EUR', else: '0' } },
                        GBP: { $cond: { if: '$GBP', then: '$GBP', else: '0' } },
                        CAD: { $cond: { if: '$CAD', then: '$CAD', else: '0' } },
                        BDS: { $cond: { if: '$BDS', then: '$BDS', else: '0' } },
                        TTD: { $cond: { if: '$TTD', then: '$TTD', else: '0' } }
                    }
                }
            ])
            let totalAmountDeposited = await qrSingleMdel.aggregate([
                { $match: { customerID: findUser._id, clientID: findUser.company, ScannedByCustomer: true, ScannedByTeller: true, createdAt: { $gte: startingDate, $lte: endingDate } } },
                {
                    $group: {
                        _id: "totalAmount",
                        total: { $sum: "$total.value" }
                    }
                }
            ])
            const csvWriter = createCsvWriter({
                path: `reports/Total_deposits_FX_customer_${findUser._id}.csv`,
                header: [
                    { id: 'totalInLocal', title: 'Amount (Local currency)' },
                    { id: 'totalInFX', title: 'Amount (FX)' },
                    { id: 'USD', title: 'EQV (USD)' },
                    { id: 'GBP', title: 'EQV (GBP)' },
                    { id: 'EUR', title: 'EQV (EUR)' },
                    { id: 'CAD', title: 'EQV (CAD)' },
                    { id: 'BDS', title: 'EQV (BDS)' },
                    { id: 'TTD', title: 'EQV (TTD)' },
                    { id: 'totalInChecks', title: 'Amount (Checks)' },
                    { id: 'grandTotal', title: 'Total amount' },
                    { id: 'dateCreated', title: 'Created At' },
                    { id: 'dateUpdated', title: 'Verified At' },
                ]
            });
            let headers = ['Sr.', 'Amount (Local currency)', 'Amount (FX)', 'EQV (USD)', 'EQV (GBP)', 'EQV (EUR)', 'EQV (CAD)', 'EQV (BDS)', 'EQV (TTD)', 'Amount (Checks)', 'Total Amount', 'Created At', 'Verified At']
            let title = "Total Deposits Report in FX"
            let totalAmountDepositedFX = 0
            totalDeposits.map(item => {
                totalAmountDepositedFX = totalAmountDepositedFX + item.totalInFX
            })
            let myHeader = [
                {
                    totalInLocal: totalAmountDepositedFX,
                    dateCreated: '',
                    totalInFX: '',
                    totalInChecks: '',
                    grandTotal: `${totalAmountDeposited.length > 0 ? totalAmountDeposited[0].total : 0}`,
                    dateCreated: '',
                    dateUpdated: '',
                    USD: '',
                    EUR: '',
                    GBP: '',
                    CAD: '',
                    BDS: '',
                    TTD: '',
                }
            ]
            csvWriter
                .writeRecords(myHeader.concat(totalDeposits).reverse())
            let table = `
                <p style="text-align:center;">${req.body.startingDate} - ${req.body.endingDate}<span style="font-weight:bold;font-size:24px;margin-left:50px;margin-right:50px;">${title}</span>Total amount (FX): $${totalAmountDepositedFX}</p>
                `
            table += "<table border='1' style='width:100%;word-break:break-word;'>";
            table += "<tr>";
            headers.map(item => {
                table += `<th >${item}</th>`;
            })
            table += "</tr>";

            totalDeposits.reverse().forEach(function (row, index) {
                table += "<tr>";
                table += "<td style='text-align:left;'>" + (index + 1) + "</td>";
                table += "<td style='text-align:right;'>" + row.totalInLocal + "</td>";
                table += "<td style='text-align:right;'>" + row.totalInFX + "</td>";
                table += "<td style='text-align:right;'>" + row.USD + "</td>";
                table += "<td style='text-align:right;'>" + row.GBP + "</td>";
                table += "<td style='text-align:right;'>" + row.EUR + "</td>";
                table += "<td style='text-align:right;'>" + row.CAD + "</td>";
                table += "<td style='text-align:right;'>" + row.BDS + "</td>";
                table += "<td style='text-align:right;'>" + row.TTD + "</td>";
                table += "<td style='text-align:right;'>" + row.totalInChecks + "</td>";
                table += "<td style='text-align:right;'>" + row.grandTotal + "</td>";
                table += "<td style='text-align:center;'>" + row.dateCreated + "</td>";
                table += "<td style='text-align:center;'>" + row.dateUpdated + "</td>";
                table += "</tr>";
            });
            table += "</table>";

            var options = {
                "format": "A4",
                "orientation": "landscape",
                "border": {
                    "top": "0.1in",
                },
                "timeout": "120000"
            };
            pdf.create(table, options).toFile(`reports/Total_deposits_FX_customer_${findUser._id}.pdf`, function (err, result) {
                if (err) {
                    throw (err)
                } else {
                    let userResponce = {
                        length: totalDeposits.length,
                        downloadPDF: `${basr_url}/reports/Total_deposits_FX_customer_${findUser._id}.pdf`,
                        downloadCSV: `${basr_url}/reports/Total_deposits_FX_customer_${findUser._id}.csv`
                    }
                    let result = makeApiResponce(`Total deposits report generated`, 1, OK, userResponce);
                    return res.json(result);
                }
            })
        } catch (err) {
            console.log(err)
            let result = makeApiResponce(err, 0, INTERNAL_SERVER_ERROR);
            return res.status(INTERNAL_SERVER_ERROR).json(result)
        }
    },
    async TotalDepositsReportChecksCustomer(req, res) {
        try {
            let startingDate = new Date(req.body.startingDate)
            const endingDate = new Date(req.body.endingDate)
            endingDate.setDate(endingDate.getDate() + 1)
            const decoded_id = await decode(req.query.x_auth);
            const findUser = await staffModel.findById(decoded_id);
            if (!findUser) {
                let result = makeApiResponce('Unauthorized Attempt', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            if (findUser.accountType != "customer") {
                let result = makeApiResponce('Only customer can call this API', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            if (startingDate >= endingDate) {
                let result = makeApiResponce('Starting date must not to greater than or equal to ending date', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            let totalDeposits = await qrSingleMdel.aggregate([
                { $match: { customerID: findUser._id, clientID: findUser.company, ScannedByCustomer: true, ScannedByTeller: true, createdAt: { $gte: startingDate, $lte: endingDate } } },
                {
                    $addFields: {
                        totalInLocal: { $sum: '$Xcd.value' },
                        totalInFX: { $sum: '$FX.EQV' },
                        totalInChecks: { $sum: '$checks.checkAmount' },
                        grandTotal: '$total.value',

                    }
                },
                {
                    $project: {
                        _id: 1,
                        totalInLocal: 1,
                        totalInFX: 1,
                        totalInChecks: 1,
                        grandTotal: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        dateCreated: { $dateToString: { format: "%Y-%m-%d / %H:%M:%S", date: "$createdAt" } },
                        dateUpdated: { $dateToString: { format: "%Y-%m-%d / %H:%M:%S", date: "$updatedAt" } },
                        array: {
                            $arrayToObject: {
                                $map: {
                                    input: '$checks',
                                    as: 'item',
                                    in: {
                                        k: '$$item.index',
                                        v: { $concat: ["Check", { $toString: "$$item.checkNumber" }, ', Amount :$', { $toString: "$$item.checkAmount" }] }
                                    }
                                }
                            }
                        },

                    }
                },
                {
                    $replaceRoot: {
                        newRoot: {
                            $mergeObjects: [
                                '$array',
                                { totalInLocal: '$totalInLocal', grandTotal: '$grandTotal', dateCreated: '$dateCreated', dateUpdated: '$dateUpdated', totalInChecks: '$totalInChecks', totalInFX: '$totalInFX', totalChecks: '$totalChecks', CheckNo1: '$CheckNo1', CheckNo2: '$CheckNo2', CheckNo3: '$CheckNo3', CheckNo4: '$CheckNo4', CheckNo5: '$CheckNo5' }
                            ]
                        }
                    }
                },
                {
                    $project: {
                        totalInLocal: 1,
                        totalInFX: 1,
                        totalInChecks: 1,
                        grandTotal: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        dateCreated: 1,
                        dateUpdated: 1,
                        CheckNo1: { $cond: { if: '$CheckNo1', then: '$CheckNo1', else: '-' } },
                        CheckNo2: { $cond: { if: '$CheckNo2', then: '$CheckNo2', else: '-' } },
                        CheckNo3: { $cond: { if: '$CheckNo3', then: '$CheckNo3', else: '-' } },
                        CheckNo4: { $cond: { if: '$CheckNo4', then: '$CheckNo4', else: '-' } },
                        CheckNo5: { $cond: { if: '$CheckNo5', then: '$CheckNo5', else: '-' } },
                    }
                }
            ])
            console.log(totalDeposits)
            let totalAmountDeposited = await qrSingleMdel.aggregate([
                { $match: { customerID: findUser._id, clientID: findUser.company, ScannedByCustomer: true, ScannedByTeller: true, createdAt: { $gte: startingDate, $lte: endingDate } } },
                {
                    $group: {
                        _id: "totalAmount",
                        total: { $sum: "$total.value" }
                    }
                }
            ])

            const csvWriter = createCsvWriter({
                path: `reports/Total_deposits_checks_report_customer_${findUser._id}.csv`,
                header: [
                    { id: 'totalInLocal', title: 'Amount (Local currency)' },
                    { id: 'totalInFX', title: 'Amount (FX)' },
                    { id: 'CheckNo1', title: 'Check#1' },
                    { id: 'CheckNo2', title: 'Check#2' },
                    { id: 'CheckNo3', title: 'Check#3' },
                    { id: 'CheckNo4', title: 'Check#4' },
                    { id: 'CheckNo5', title: 'Check#5' },
                    { id: 'totalInChecks', title: 'Amount (Checks)' },
                    { id: 'grandTotal', title: 'Total amount' },
                    { id: 'dateCreated', title: 'Created At' },
                    { id: 'dateUpdated', title: 'Verified At' },
                ]
            });
            totalDeposits.map(item => {
                totalAmountDepositedChecks = totalAmountDepositedChecks + item.totalInChecks
            })
            let myHeader = [
                {
                    totalInLocal: '',
                    dateCreated: '',
                    totalInFX: '',
                    totalInChecks: totalAmountDepositedChecks,
                    grandTotal: `${totalAmountDeposited.length > 0 ? totalAmountDeposited[0].total : 0}`,
                    CheckNo1: '',
                    CheckNo2: '',
                    CheckNo3: '',
                    CheckNo4: '',
                    CheckNo5: '',
                }
            ]
            let headers = ['Sr.', 'Amount (Local currency)', 'Amount (FX)', 'Amount (Checks)', 'Check#1', 'Check#2', 'Check#3', 'Check#4', 'Check#5', 'Total Amount', 'Created At', 'Verified At']
            let title = "Total Deposits Report in Checks"
            csvWriter
                .writeRecords(myHeader.concat(totalDeposits).reverse())
            let table = `
                <p style="text-align:center;">${req.body.startingDate} - ${req.body.endingDate}<span style="font-weight:bold;font-size:24px;margin-left:50px;margin-right:50px;">${title}</span>Total amount (Checks): $${totalAmountDepositedChecks}</p>
                `
            table += "<table border='1' style='width:100%;word-break:break-word;'>";
            table += "<tr>";
            headers.map(item => {
                table += `<th >${item}</th>`;
            })
            table += "</tr>";

            totalDeposits.reverse().forEach(function (row, index) {
                table += "<tr>";
                table += "<td style='text-align:left;'>" + (index + 1) + "</td>";
                table += "<td style='text-align:right;'>" + row.totalInLocal + "</td>";
                table += "<td style='text-align:right;'>" + row.totalInFX + "</td>";
                table += "<td style='text-align:right;'>" + row.totalInChecks + "</td>";
                table += "<td style='text-align:center;'>" + row.CheckNo1 + "</td>";
                table += "<td style='text-align:center;'>" + row.CheckNo2 + "</td>";
                table += "<td style='text-align:cenetr;'>" + row.CheckNo3 + "</td>";
                table += "<td style='text-align:center;'>" + row.CheckNo4 + "</td>";
                table += "<td style='text-align:center;'>" + row.CheckNo5 + "</td>";
                table += "<td style='text-align:right;'>" + row.grandTotal + "</td>";
                table += "<td style='text-align:center;'>" + row.dateCreated + "</td>";
                table += "<td style='text-align:center;'>" + row.dateUpdated + "</td>";
                table += "</tr>";
            });
            table += "</table>";

            var options = {
                "format": "A4",
                "orientation": "landscape",
                "border": {
                    "top": "0.1in",
                },
                "timeout": "120000"
            };
            pdf.create(table, options).toFile(`reports/Total_deposits_checks_report_customer_${findUser._id}.pdf`, function (err, result) {
                if (err) {
                    throw (err)
                } else {
                    let userResponce = {
                        downloadPDF: `${basr_url}/reports/Total_deposits_checks_report_customer_${findUser._id}.pdf`,
                        downloadCSV: `${basr_url}/reports/Total_deposits_checks_report_customer_${findUser._id}.csv`
                    }
                    let result = makeApiResponce(`Total deposits report generated`, 1, OK, userResponce);
                    return res.json(result);
                }
            })
        } catch (err) {
            console.log(err)
            let result = makeApiResponce(err, 0, INTERNAL_SERVER_ERROR);
            return res.status(INTERNAL_SERVER_ERROR).json(result)
        }
    },
    async storeFcm(req, res) {
        try {
            const decoded_id = await decode(req.query.x_auth);
            const findUser = await staffModel.findById(decoded_id);
            if (!findUser) {
                let result = makeApiResponce('Unauthorized Attempt', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            if (!req.body.fcm) {
                let result = makeApiResponce('Please send fcm token', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            await staffModel.findByIdAndUpdate(findUser._id, { fcm: req.body.fcm })
            let userResponce = {}
            let result = makeApiResponce(`FCM Stored`, 1, OK, userResponce);
            return res.json(result);
        } catch (error) {
            console.log(err)
            let result = makeApiResponce(err, 0, INTERNAL_SERVER_ERROR);
            return res.status(INTERNAL_SERVER_ERROR).json(result)
        }
    }
}