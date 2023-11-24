import { BAD_REQUEST, INTERNAL_SERVER_ERROR, OK } from "http-status-codes";
import bcryptjs from 'bcryptjs';
import userService from "../../services/user.service.js";
import staffService from "../../services/staff.service.js";
import UserModel from "../../models/user.model";
import staffModel from "../../models/staff.model.js";
import companyModel from "../../models/company.model.js";
import { getJWTToken, randomValueHex, getEncryptedPassword, decode, decodeToken, makeid } from '../../libraries/util';
import { makeApiResponce } from '../../libraries/responce';
import { sendEmail } from "../../libraries/mail";
import qrBatchesModel from "../../models/qrBatches.model.js";
import qrSingleMdel from "../../models/qrSingle.mdel.js";
import NotificationModel from "../../models/notification.model.js";

var pdf = require('html-pdf');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const basr_url = 'http://35.182.155.247'

export default {
    // async test(req, res) {
    //     res.status(200).json({"conneted": 'true'})
    // },

    async test(req, res) {
        try {


            // const findUser = await staffModel.findById(decoded_id);
            // if (!findUser) {
            //     let result = makeApiResponce('Unauthorized Attempt', 1, BAD_REQUEST)
            //     return res.status(BAD_REQUEST).json(result);
            // }
            // const bagsCount = new bagsCountModel({count:0})
            // await bagsCount.save()
            const email = "admin@admin.com"
            const hash = await getEncryptedPassword("admin");
            const user = new staffModel({ email: email, password: hash })
            await user.save()
            // const decoded_id = await decode(req.headers.x_auth);
            const id = makeid(10)
            return res.status(200).json({ "token": 'decoded', "id": id });
        } catch (error) {
            let result = makeApiResponce('INTERNAL_SERVER_ERROR', 0, INTERNAL_SERVER_ERROR, error);
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
    async login(req, res) {
        try {
            // VALIDATE THE REQUEST
            const { error, value } = staffService.validateStaffLoginSchemaForWeb(req.body);
            if (error && error.details) {
                let result = makeApiResponce(error.message, 0, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            // FETCH THE USER
            const userQuery = { email: req.body.email_address };

            let user = await staffModel.findOne(userQuery);
            if (!user) {
                let result = makeApiResponce('Email is not registered', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            const matched = await bcryptjs.compare(req.body.password, user.password)
            if (!matched) {
                let result = makeApiResponce('Incorrect password', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            if (user.accountType != "superadmin" && user.accountType != "admin" && user.accountType != "supervisor") {
                let result = makeApiResponce(`${user.accountType}s are not allowed to access admin panel`, 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            if (user.accountType != "superadmin") {
                const company = await companyModel.findById(user.company)
                if (company.companyStatus === "disabled") {
                    let result = makeApiResponce('Company assigned against this user is currently disabled', 1, BAD_REQUEST)
                    return res.status(BAD_REQUEST).json(result);
                }
            }
            const token = await getJWTToken({ id: user._id });
            let company
            if (user.company) {
                company = await companyModel.findById(user.company)
            }
            let userResponce;
            userResponce = {
                userData: user,
                token,
                company
            }
            let result = makeApiResponce('Login Success', 1, OK, userResponce);
            return res.json(result);


        } catch (err) {
            console.log(err.message)
            let result = makeApiResponce(err.message, 0, INTERNAL_SERVER_ERROR);
            return res.status(INTERNAL_SERVER_ERROR).json(result)
        }
    },

    async getLoginUserProfile(req, res) {
        return res.json(req.currentUser);
    },



    async passwordReset(req, res) {
        try {

            const findUser = await UserModel.findOne({ email: req.body.email });
            if (!findUser) {
                let result = makeApiResponce('Please double-check the email you entered is correct.', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }

            // UPDATE THE USER
            const hash = await getEncryptedPassword(req.body.newPassword);
            findUser.password = hash;
            await findUser.save();

            let userResponce = {};

            let result = makeApiResponce('Password Updated Successfully', 1, OK, userResponce);
            return res.json(result);

        } catch (err) {
            console.log(err);
            let result = makeApiResponce('INTERNAL_SERVER_ERROR', 0, INTERNAL_SERVER_ERROR);
            return res.status(INTERNAL_SERVER_ERROR).json(result)
        }
    },

    async forgotPassword(req, res) {
        try {
            const randomForgotOTP = await randomValueHex("6");
            const findUser = await UserModel.findOne({ email: req.body.email });
            if (!findUser) {
                let result = makeApiResponce('Please double-check the email you entered is correct.', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }

            // UPDATE THE USER
            const hash = await getEncryptedPassword(randomForgotOTP);
            findUser.password = hash;
            findUser.otp = randomForgotOTP;
            await findUser.save();

            const passwordLink = `
        <p>Here is your new password <span style="font-weight:bold">${randomForgotOTP}</span> login with and then change your password</a></p>
        <p><a href="http://localhost:3000/confirm-password">Enter the reset password code here</a></p>`;
            // node mailer
            const mailResponce = await sendEmail({
                html: passwordLink,
                subject: "Forgot Password",
                email: req.body.email,
            });

            let userResponce = {};
            let result = makeApiResponce('Password Updated Successfully', 1, OK, userResponce);
            return res.json(result);

        } catch (err) {
            console.log(err);
            let result = makeApiResponce('INTERNAL_SERVER_ERROR', 0, INTERNAL_SERVER_ERROR);
            return res.status(INTERNAL_SERVER_ERROR).json(result)
        }
    },

    async verifyOTP(req, res) {
        try {
            // FETCH THE USER
            const userQuery = { email: req.body.email, otp: req.body.otp };
            let user = await UserModel.findOne(userQuery);
            if (!user) {
                let result = makeApiResponce('Invalid otp', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }

            user.statusBit = true;
            await user.save();

            const token = await getJWTToken({ id: user._id });
            let userResponce;
            userResponce = {
                userData: user,
                token: token
            }
            let result = makeApiResponce('Verify OTP Successfully', 1, OK, userResponce);
            return res.json(result);

        } catch (err) {
            console.log(err);
            let result = makeApiResponce('INTERNAL_SERVER_ERROR', 0, INTERNAL_SERVER_ERROR);
            return res.status(INTERNAL_SERVER_ERROR).json(result)
        }
    },


    /////////// user crud /////////////////

    async listing(req, res) {
        try {
            await UserModel.find({ "userType": "admin" }, function (err, users) {
                if (err) {
                    let result = makeApiResponce('INTERNAL_SERVER_ERROR', 0, INTERNAL_SERVER_ERROR);
                    return res.status(INTERNAL_SERVER_ERROR).json(result)
                } else {
                    let userRecord = [];
                    users.forEach((doc) => {
                        userRecord.push({
                            id: doc._id,
                            firstName: doc.firstName,
                            lastName: doc.lastName,
                            email: doc.email,
                            userType: doc.userType,
                            statusBit: doc.statusBit
                        });
                    });
                    let couponResponce = userRecord;
                    let result = makeApiResponce('User Listing', 1, OK, couponResponce);
                    return res.json(result);
                }
            })

        } catch (err) {
            console.log(err);
            let result = makeApiResponce('INTERNAL_SERVER_ERROR', 0, INTERNAL_SERVER_ERROR);
            return res.status(INTERNAL_SERVER_ERROR).json(result)
        }
    },


    async add(req, res) {
        try {

            const randomOtp = await randomValueHex("6");

            // VALIDATE THE REQUEST
            // const {error, value} = userService.validateAddUserSchema(req.body);
            // if(error && error.details){
            //     let result = makeApiResponce(error.message, 0, BAD_REQUEST)
            //     return res.status(BAD_REQUEST).json(result);
            // }

            const existingUser = await UserModel.findOne({ email: req.body.email });
            if (existingUser) {
                let result = makeApiResponce('Email is Already Exsit', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            const user = new UserModel();
            user.email = req.body.email;
            user.firstName = req.body.firstName;
            user.lastName = req.body.lastName;
            user.userType = req.body.userType;
            user.statusBit = req.body.statusBit;
            user.otp = randomOtp;
            const hash = await getEncryptedPassword('12345678');
            user.password = hash;
            await user.save();
            let userResponce = {
                id: user._id
            }

            let result = makeApiResponce('User Created Successfully', 1, OK, userResponce);
            return res.json(result);

        } catch (err) {
            console.log(err);
            let result = makeApiResponce('INTERNAL_SERVER_ERROR', 0, INTERNAL_SERVER_ERROR);
            return res.status(INTERNAL_SERVER_ERROR).json(result)
        }
    },


    async update(req, res) {
        try {

            const findUser = await UserModel.findById(req.params.id);
            if (!findUser) {
                let result = makeApiResponce('Coupon not found.', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }

            // VALIDATE THE REQUEST
            // const {error, value} = userService.validateUpdateUserSchema(req.body);
            // if(error && error.details){
            //     let result = makeApiResponce(error.message, 0, BAD_REQUEST)
            //     return res.status(BAD_REQUEST).json(result);
            // }

            findUser.firstName = req.body.firstName;
            findUser.lastName = req.body.lastName;
            findUser.userType = req.body.userType;
            findUser.statusBit = req.body.statusBit;
            await findUser.save();

            let userResponce = {
                id: findUser._id
            }

            let result = makeApiResponce('User updated successfully', 1, OK, userResponce);
            return res.json(result);

        } catch (err) {
            console.log(err);
            let result = makeApiResponce('INTERNAL_SERVER_ERROR', 0, INTERNAL_SERVER_ERROR);
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
                userData: findUser
            }

            let result = makeApiResponce('User updated', 1, OK, userResponce);
            return res.json(result);

        } catch (err) {
            console.log(err);
            let result = makeApiResponce('INTERNAL_SERVER_ERROR', 0, INTERNAL_SERVER_ERROR, err);
            return res.status(INTERNAL_SERVER_ERROR).json(result)
        }
    },

    async detail(req, res) {
        try {

            const findUser = await UserModel.findById(req.params.id);
            if (!findUser) {
                let result = makeApiResponce('User not found.', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            let userResponce = {
                id: findUser._id,
                firstName: findUser.firstName,
                lastName: findUser.lastName,
                email: findUser.email,
                userType: findUser.userType,
                statusBit: findUser.statusBit
            }
            let result = makeApiResponce('User Detail', 1, OK, userResponce);
            return res.json(result);

        } catch (err) {
            console.log(err);
            let result = makeApiResponce('INTERNAL_SERVER_ERROR', 0, INTERNAL_SERVER_ERROR);
            return res.status(INTERNAL_SERVER_ERROR).json(result)
        }
    },

    async delete(req, res) {
        try {
            const findUser = await UserModel.findById(req.params.id);
            if (!findUser) {
                let result = makeApiResponce('User not found.', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }

            const deleteUser = await UserModel.deleteOne({ _id: req.params.id });
            if (!deleteUser) {

                let result = makeApiResponce('Network Error please try again.', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }

            let userResponce = {};
            let result = makeApiResponce('User Delete Successfully', 1, OK, userResponce);
            return res.json(result);

        } catch (err) {
            console.log(err);
            let result = makeApiResponce('INTERNAL_SERVER_ERROR', 0, INTERNAL_SERVER_ERROR);
            return res.status(INTERNAL_SERVER_ERROR).json(result)
        }
    },
    // SUPER ADMIN ACTIONS 
    async registerClient(req, res) {
        try {
            const decoded_id = await decode(req.query.x_auth);
            const findUser = await staffModel.findById(decoded_id);
            if (!findUser) {
                let result = makeApiResponce('Unauthorized Attempt', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            const pre_company = await companyModel.findOne({ companyName: req.body.clientName });
            if (pre_company) {
                let result = makeApiResponce(`Client with name "${req.body.clientName}" already exists`, 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }

            // VALIDATE THE REQUEST
            const { error, value } = staffService.validateRegisterClientSchema(req.body);
            if (error && error.details) {
                let result = makeApiResponce(error.details[0].message, 0, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            const user = new companyModel()
            user.companyName = req.body.clientName;
            user.companyStatus = "active";
            user.abbrevation = req.body.clientAbbrevation;
            user.country = req.body.clientCountry;
            user.email = req.body.clientEmail;
            user.image = req.body.image;
            await user.save();

            let userResponce = {}

            let result = makeApiResponce('New client created', 1, OK, userResponce);
            return res.json(result);

        } catch (err) {
            console.log(err);
            let result = makeApiResponce('INTERNAL_SERVER_ERROR', 0, INTERNAL_SERVER_ERROR);
            return res.status(INTERNAL_SERVER_ERROR).json(result)
        }
    },

    async registerClientAdmin(req, res) {

        try {
            const decoded_id = await decode(req.query.x_auth);
            const findUser = await staffModel.findById(decoded_id);
            if (!findUser) {
                let result = makeApiResponce('Unauthorized Attempt', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            const company = await companyModel.findOne({ companyName: req.body.company })
            if (!company) {
                let result = makeApiResponce(`No company with name "${req.body.company}" exists`, 0, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            const pre_admin = await staffModel.findOne({ accountType: 'admin', company: company });
            if (pre_admin) {
                let result = makeApiResponce('Only 1 admin per client in allowed', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            const pre_email = await staffModel.findOne({ email: req.body.email });
            if (pre_email) {
                let result = makeApiResponce(`Email already registered for role of ${pre_email.accountType}`, 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }

            // VALIDATE THE REQUEST
            const { error, value } = staffService.validateRegisterClientAdminSchema(req.body);
            if (error && error.details) {
                let result = makeApiResponce(error.details[0].message, 0, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }

            const user = new staffModel()
            user.name = req.body.name;
            user.email = req.body.email;
            user.accountType = 'admin';
            const hash = await getEncryptedPassword(req.body.password);
            user.company = company
            user.password = hash;
            await user.save();

            let userResponce = {}

            let result = makeApiResponce('Client admin created', 1, OK, userResponce);
            return res.json(result);

        } catch (err) {
            console.log(err);
            let result = makeApiResponce('INTERNAL_SERVER_ERROR', 0, INTERNAL_SERVER_ERROR);
            return res.status(INTERNAL_SERVER_ERROR).json(result)
        }
    },

    async setupClientParameters(req, res) {
        try {
            const decoded_id = await decode(req.query.x_auth);
            const findUser = await staffModel.findById(decoded_id);
            if (!findUser) {
                let result = makeApiResponce('Unauthorized Attempt', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            // Extra security
            // if(findUser.accountType!="superadmin" || findUser.accountType!="admin"){
            //     let result = makeApiResponce('Only admins can perform this task', 1, BAD_REQUEST)
            //     return res.status(BAD_REQUEST).json(result);
            // }
            // VALIDATE THE REQUEST
            const { error, value } = staffService.validateSetupParametersSchema(req.body);
            if (error && error.details) {
                let result = makeApiResponce(error.details[0].message, 0, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            const company = await companyModel.findOne({ companyName: req.body.name })
            if (!company) {
                let result = makeApiResponce(`No company with name "${req.body.name}" exists`, 0, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            console.log(req.body.image)
            company.name = req.body.name;
            company.email = req.body.email;
            company.country = req.body.country;
            company.abbrevation = req.body.abbreviation;
            company.localCurrency = req.body.localCurrency;
            company.FXAllowed = req.body.FXAllowed;
            company.second_email = req.body.second_email;
            company.image = req.body.image;
            await company.save();
            let userResponce = {
                company
            }

            let result = makeApiResponce('Client parameters updated', 1, OK, userResponce);
            return res.json(result);

        } catch (err) {
            console.log(err);
            let result = makeApiResponce('INTERNAL_SERVER_ERROR', 0, INTERNAL_SERVER_ERROR);
            return res.status(INTERNAL_SERVER_ERROR).json(result)
        }
    },

    async registerSupervisorTeler(req, res) {
        try {
            const decoded_id = await decode(req.query.x_auth);
            const findUser = await staffModel.findById(decoded_id);
            if (!findUser) {
                let result = makeApiResponce('Unauthorized Attempt', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            const company = await companyModel.findOne({ companyName: req.body.company })
            if (!company) {
                let result = makeApiResponce(`No company with name "${req.body.company}" exists`, 0, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            const pre_email = await staffModel.findOne({ email: req.body.email });
            if (pre_email) {
                let result = makeApiResponce(`Email already registered for role of ${pre_email.accountType}`, 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            // VALIDATE THE REQUEST
            const { error, value } = staffService.validateRegisterSupervisorTelerSchema(req.body);
            if (error && error.details) {
                let result = makeApiResponce(error.details[0].message, 0, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            const user = new staffModel()
            user.company = company;
            user.name = req.body.name;
            const hash = await getEncryptedPassword(req.body.password);
            user.password = hash;
            user.accountType = req.body.employeeType;
            user.email = req.body.email;
            await user.save();

            let userResponce = {}

            let result = makeApiResponce(`New ${req.body.employeeType} created`, 1, OK, userResponce);
            return res.json(result);

        } catch (err) {
            console.log(err);
            let result = makeApiResponce('INTERNAL_SERVER_ERROR', 0, INTERNAL_SERVER_ERROR);
            return res.status(INTERNAL_SERVER_ERROR).json(result)
        }
    },

    async registerCustomer(req, res) {
        try {
            const decoded_id = await decode(req.query.x_auth);
            const findUser = await staffModel.findById(decoded_id);
            if (!findUser) {
                let result = makeApiResponce('Unauthorized Attempt', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            const company = await companyModel.findOne({ companyName: req.body.client })
            if (!company) {
                let result = makeApiResponce(`No company with name "${req.body.client}" exists`, 0, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            const pre_email = await staffModel.findOne({ email: req.body.email });
            if (pre_email) {
                let result = makeApiResponce(`Email already registered for role of ${pre_email.accountType}`, 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            // VALIDATE THE REQUEST
            // const { error, value } = userService.validateRegisterCustomerSchema(req.body);
            // if (error && error.details) {
            //     let result = makeApiResponce(error.details[0].message, 0, BAD_REQUEST)
            //     return res.status(BAD_REQUEST).json(result);
            // }
            const user = new staffModel()
            user.company = company;
            user.name = req.body.name;
            user.accountNumber = req.body.account_number;
            const hash = await getEncryptedPassword(req.body.password);
            user.password = hash;
            user.accountType = "customer";
            user.email = req.body.email;
            await user.save();
            console.log(user)
            let userResponce = {}
            let result = makeApiResponce('New customer created', 1, OK, userResponce);
            return res.json(result);

        } catch (err) {
            console.log(err);
            let result = makeApiResponce('INTERNAL_SERVER_ERROR', 0, INTERNAL_SERVER_ERROR);
            return res.status(INTERNAL_SERVER_ERROR).json(result)
        }
    },

    async loadCustomerList(req, res) {
        try {
            const decoded_id = await decode(req.query.x_auth);
            const findUser = await staffModel.findById(decoded_id);
            if (!findUser) {
                let result = makeApiResponce('Unauthorized Attempt', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            let customerList = []
            let supervisorList = []
            if (findUser.accountType === 'superadmin') {
                customerList = await staffModel.aggregate([
                    { $match: { accountType: "customer" } },
                    {
                        $lookup: {
                            from: 'companies',
                            localField: 'company',
                            foreignField: '_id',
                            as: "client"
                        },
                    },
                    // { $sort: { createdAt: 1 } }
                ]);
                supervisorList = await staffModel.aggregate([
                    { $match: { $or: [{ accountType: "supervisor" }, { accountType: "teller" }] } },
                    {
                        $lookup: {
                            from: 'companies',
                            localField: 'company',
                            foreignField: '_id',
                            as: "client"
                        },
                    }
                ])
            } else if (findUser.accountType === 'admin') {
                customerList = await staffModel.aggregate([
                    { $match: { accountType: "customer", company: findUser.company } },
                    {
                        $lookup: {
                            from: 'companies',
                            localField: 'company',
                            foreignField: '_id',
                            as: "client"
                        },
                    },
                    // { $sort: { createdAt: 1 } }
                ]);
                supervisorList = await staffModel.aggregate([
                    { $match: { $or: [{ accountType: "supervisor" }, { accountType: "teller" }], company: findUser.company } },
                    {
                        $lookup: {
                            from: 'companies',
                            localField: 'company',
                            foreignField: '_id',
                            as: "client"
                        },
                    }
                ])
            } else {
                customerList = await staffModel.aggregate([
                    { $match: { accountType: "customer", company: findUser.company } },
                    {
                        $lookup: {
                            from: 'companies',
                            localField: 'company',
                            foreignField: '_id',
                            as: "client"
                        },
                    },
                    // { $sort: { createdAt: 1 } }
                ]);
            }
            // if (findUser.accountType === "superadmin" || findUser.accountType === "admin" || findUser.accountType === "supervisor") {
            //     let customerList = await staffModel.aggregate([
            //         { $match: { accountType: "customer" } },
            //         {
            //             $lookup: {
            //                 from: 'companies',
            //                 localField: 'company',
            //                 foreignField: '_id',
            //                 as: "client"
            //             },
            //         },
            //         { $sort: { createdAt: 1 } }
            //     ]);
            //     if (findUser.accountType === "superadmin") {
            //         supervisorList = await staffModel.aggregate([
            //             { $match: { $or: [{ accountType: "supervisor" }, { accountType: "teller" }] } },
            //             {
            //                 $lookup: {
            //                     from: 'companies',
            //                     localField: 'company',
            //                     foreignField: '_id',
            //                     as: "client"
            //                 },
            //             }
            //         ])
            //     } else if (findUser.accountType === "admin") {
            //         supervisorList = await staffModel.aggregate([
            //             { $match: { $or: [{ accountType: "supervisor" }, { accountType: "teller" }], company: findUser.company } },
            //             {
            //                 $lookup: {
            //                     from: 'companies',
            //                     localField: 'company',
            //                     foreignField: '_id',
            //                     as: "client"
            //                 },
            //             }
            //         ])
            //     }
            //     let userResponce = {
            //         customerList: customerList.reverse(),
            //         supervisorList: supervisorList.reverse()
            //     }
            //     let result = makeApiResponce('Customer list loaded', 1, OK, userResponce);
            //     return res.json(result);
            // }


            // const company = await companyModel.findById(findUser.company)
            // if(!company){
            //     let result = makeApiResponce(`No company with name "${req.body.client}" exists` , 0, BAD_REQUEST)
            //     return res.status(BAD_REQUEST).json(result);
            // }

            // let customerList = await UserModel.find({ clientID: findUser.company })
            let userResponce = {
                customerList: customerList.reverse(),
                supervisorList: supervisorList.reverse()
            }
            let result = makeApiResponce('Customer list loaded', 1, OK, userResponce);
            return res.json(result);

        } catch (err) {
            console.log(err);
            let result = makeApiResponce('INTERNAL_SERVER_ERROR', 0, INTERNAL_SERVER_ERROR, err);
            return res.status(INTERNAL_SERVER_ERROR).json(result)
        }
    },


    async loadClientList(req, res) {
        try {
            const decoded_id = await decode(req.query.x_auth);
            const findUser = await staffModel.findById(decoded_id);
            if (!findUser) {
                let result = makeApiResponce('Unauthorized Attempt', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            let clientList = await companyModel.aggregate([
                {
                    $lookup: {
                        from: 'staffs',
                        localField: '_id',
                        foreignField: 'company',
                        as: "admin",
                        pipeline: [
                            { $match: { "accountType": 'admin' } }
                        ]
                    }
                }
            ])
            let userResponce = {
                clientList,
            }
            let result = makeApiResponce('Client list loaded', 1, OK, userResponce);
            return res.json(result);
        } catch (err) {
            console.log(err);
            let result = makeApiResponce('INTERNAL_SERVER_ERROR', 0, INTERNAL_SERVER_ERROR, err);
            return res.status(INTERNAL_SERVER_ERROR).json(result)
        }
    },

    async generateQrBatch(req, res) {
        try {
            const decoded_id = await decode(req.query.x_auth);
            const findUser = await staffModel.findById(decoded_id);
            if (!findUser) {
                let result = makeApiResponce('Unauthorized Attempt', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            // const company = await companyModel.findById(findUser.company)
            // if(!company){
            //     let result = makeApiResponce(`No company with name "${req.body.client}" exists` , 0, BAD_REQUEST)
            //     return res.status(BAD_REQUEST).json(result);
            // }

            let qrBatch = new qrBatchesModel()
            qrBatch.clientID = req.body.clientID
            qrBatch.customerID = req.body.customerID
            qrBatch.customerName = req.body.customerName
            qrBatch.bagsCount = req.body.bagsCount
            let bagID = []
            for (let i = 0; i < req.body.bagsCount; i++) {
                const id = req.body.clientID + "-" + req.body.customerID + "-" + makeid(10)
                bagID.push(id)
                let qr = new qrSingleMdel({ bagID: id, qrBatch: qrBatch, customerID: req.body.customerID, clientID: req.body.clientID })
                await qr.save()
            }
            qrBatch.bagID = bagID
            await qrBatch.save()
            const customer = await staffModel.findById(qrBatch.customerID)
            // const notificationModel = new NotificationModel();
            // notificationModel.user = customer._id;
            // notificationModel.title = "New QR codes generated";
            // notificationModel.body = `${req.body.bagsCount} new bags have been successfully generated for you.`;
            // notificationModel.type = "depositApproved";
            // notificationModel.save();
            // await sendNotification(
            //     customer.fcm,
            //     {
            //         title: "New QR codes generated",
            //         body: `${req.body.bagsCount} new bags have been successfully generated for you.`,
            //     }
            // );
            let userResponce = {}
            let result = makeApiResponce('QR Batch Generated', 1, OK, userResponce);
            return res.json(result);

        } catch (err) {
            console.log(err);
            let result = makeApiResponce(err.message, 0, INTERNAL_SERVER_ERROR);
            return res.status(INTERNAL_SERVER_ERROR).json(result)
        }
    },

    async getQrBatches(req, res) {
        try {
            const decoded_id = await decode(req.query.x_auth);
            const findUser = await staffModel.findById(decoded_id);
            if (!findUser) {
                let result = makeApiResponce('Unauthorized Attempt', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            const batches = await qrBatchesModel.find({ customerID: req.body.customerID })

            let userResponce = {
                batches: batches.reverse(),
            }
            let result = makeApiResponce('QR batches list loaded', 1, OK, userResponce);
            return res.json(result);

        } catch (err) {
            console.log(err);
            let result = makeApiResponce('INTERNAL_SERVER_ERROR', 0, INTERNAL_SERVER_ERROR);
            return res.status(INTERNAL_SERVER_ERROR).json(result)
        }
    },

    async qrPrinted(req, res) {
        try {
            const decoded_id = await decode(req.query.x_auth);
            const findUser = await staffModel.findById(decoded_id);
            if (!findUser) {
                let result = makeApiResponce('Unauthorized Attempt', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            const batch = await qrBatchesModel.findByIdAndUpdate(req.body.batchID, { lastPrinted: Date() })
            //  await notificationModel.findByIdAndUpdate(batch.clientID,{
            //     title:"New QR Code batch printed",
            //     body:`A new QR code batch was printed.`,
            //     typr:'Qr code'
            // })
            const batches = (await qrBatchesModel.find({ customerID: batch.customerID }))

            let userResponce = {
                batches: batches.reverse(),
            }
            let result = makeApiResponce('QR printed', 1, OK, userResponce);
            return res.json(result);

        } catch (err) {
            console.log(err);
            let result = makeApiResponce('INTERNAL_SERVER_ERROR', 0, INTERNAL_SERVER_ERROR);
            return res.status(INTERNAL_SERVER_ERROR).json(result)
        }
    },

    async editCustomerCreds(req, res) {
        try {
            const decoded_id = await decode(req.query.x_auth);
            const findUser = await staffModel.findById(decoded_id);
            if (!findUser) {
                let result = makeApiResponce('Unauthorized Attempt', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            const { error, value } = staffService.validateChangeCustomerCredsSchema(req.body);
            if (error && error.details) {
                let result = makeApiResponce(error.details[0].message, 0, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            if (req.body.type === "customer") {
                const pre_email = await staffModel.findOne({ email: req.body.email })
                if (pre_email && pre_email._id != req.body._id) {
                    let result = makeApiResponce(`Email already asigned to another customer`, 1, BAD_REQUEST)
                    return res.status(BAD_REQUEST).json(result);
                }
                const updated = await staffModel.findById(req.body._id)
                updated.email = req.body.email
                if (req.body.password) {
                    console.log(req.body.password)
                    const hash = await getEncryptedPassword(req.body.password);
                    updated.password = hash
                }
                await updated.save()
                let userResponce = {
                }
                let result = makeApiResponce('Credentials updated', 1, OK, userResponce);
                return res.json(result);
            } else {
                const pre_email = await staffModel.findOne({ email: req.body.email })
                if (pre_email && pre_email._id != req.body._id) {
                    let result = makeApiResponce(`Email already asigned to another customer`, 1, BAD_REQUEST)
                    return res.status(BAD_REQUEST).json(result);
                }
                const updated = await staffModel.findById(req.body._id)
                updated.email = req.body.email
                if (req.body.password) {
                    console.log(req.body.password)
                    const hash = await getEncryptedPassword(req.body.password);
                    updated.password = hash
                }
                await updated.save()
                let userResponce = {
                }
                let result = makeApiResponce('Credentials updated', 1, OK, userResponce);
                return res.json(result);
            }
        } catch (err) {
            console.log(err);
            let result = makeApiResponce('INTERNAL_SERVER_ERROR', 0, INTERNAL_SERVER_ERROR);
            return res.status(INTERNAL_SERVER_ERROR).json(result)
        }
    },

    async disableCompany(req, res) {
        try {
            const decoded_id = await decode(req.query.x_auth);
            const findUser = await staffModel.findById(decoded_id);
            if (!findUser) {
                let result = makeApiResponce('Unauthorized Attempt', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            const disabled = await companyModel.findById(req.body.company._id)
            if (disabled.companyStatus === "disabled") {
                disabled.companyStatus = "active"
            } else {
                disabled.companyStatus = "disabled"
            }
            await disabled.save()
            let userResponce = {

            }
            let result = makeApiResponce(`Company status changed to ${disabled.companyStatus}`, 1, OK, userResponce);
            return res.json(result);

        } catch (err) {
            console.log(err);
            let result = makeApiResponce('INTERNAL_SERVER_ERROR', 0, INTERNAL_SERVER_ERROR);
            return res.status(INTERNAL_SERVER_ERROR).json(result)
        }
    },




    // async loadTotalDepositsReport(req, res) {
    //     try {
    //         let startingDate = new Date(req.body.startingDate)
    //         const endingDate = new Date(req.body.endingDate)
    //         endingDate.setDate(endingDate.getDate() + 1)
    //         const decoded_id = await decode(req.query.x_auth);
    //         const findUser = await staffModel.findById(decoded_id);
    //         if (!findUser) {
    //             let result = makeApiResponce('Unauthorized Attempt', 1, BAD_REQUEST)
    //             return res.status(BAD_REQUEST).json(result);
    //         }
    //         if(startingDate >= endingDate) {
    //             let result = makeApiResponce('Starting date must not to greater than or equal to ending date', 1, BAD_REQUEST)
    //             return res.status(BAD_REQUEST).json(result);
    //         }
    //         if(findUser.accountType === "customer"){

    //         } else if( findUser.accountType === "teller"){

    //         } else {
    //         // const writer = csvWriter.createObjectCsvWriter({
    //         //     path: path.resolve(__dirname, 'reports/report.csv'),
    //         //     header: [
    //         //         { id: 'name', title: 'Name' },
    //         //         { id: 'email', title: 'Email' },
    //         //         { id: 'totalInLocal', title: 'Amount (Local currency)' },
    //         //         { id: 'totalInFX', title: 'Amount (FX)' },
    //         //         { id: 'totalInchecks', title: 'Amount (Checks)' },
    //         //         { id: 'grandTotal', title: 'Total amount' },
    //         //         { id: 'createdat', title: 'Created At' },
    //         //         { id: 'verifiedat', title: 'Verified At' },
    //         //     ],
    //         // });
    //         // if (findUser.accountType != "supervisor") {
    //         //     let result = makeApiResponce('Only supervisor can generate reports', 1, BAD_REQUEST)
    //         //     return res.status(BAD_REQUEST).json(result);
    //         // }
    //         const totalDeposits = await qrSingleMdel.aggregate([
    //             { $match: { clientID: findUser.company, ScannedByCustomer: true, ScannedByTeller: true, createdAt: { $gte: startingDate, $lte: endingDate } } },
    //             {
    //                 $lookup: {
    //                     from: "staffs",
    //                     localField: "customerID",
    //                     foreignField: "_id",
    //                     as: 'customerDetails'
    //                 }
    //             },
    //             {
    //                 $addFields: {
    //                     name: '$customerDetails.name',
    //                     email: '$customerDetails.email',
    //                     totalInLocal: { $sum: '$Xcd.value' },
    //                     totalInFX: { $sum: '$FX.value' },
    //                     totalInChecks: { $sum: '$checks.value' },
    //                     grandTotal: '$total.value',
    //                 }
    //             },
    //             {
    //                 $project: {
    //                     name: { $arrayElemAt: ["$customerDetails.name", 0] },
    //                     email: { $arrayElemAt: ["$customerDetails.email", 0] },
    //                     totalInLocal: 1,
    //                     totalInFX: 1,
    //                     totalInChecks: 1,
    //                     grandTotal: 1,
    //                     createdAt: 1,
    //                     updatedAt: 1,
    //                 },
    //             }
    //         ])
    //         // writer.writeRecords(totalDeposits).then(() => {
    //         //     console.log();
    //         // });
    //         let userResponce = {
    //             totalDeposits : totalDeposits.reverse(),

    //         }
    //         let result = makeApiResponce(`Total deposits report generated`, 1, OK, userResponce);
    //         return res.json(result);
    //     }
    //     } catch (err) {
    //         let result = makeApiResponce(err, 0, INTERNAL_SERVER_ERROR);
    //         return res.status(INTERNAL_SERVER_ERROR).json(result)
    //     }
    // }


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
            if (findUser.accountType != "supervisor" && findUser.accountType != "admin") {
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
            let headers = ['Sr.', 'Customer Name', 'Customer Email', 'Amount (Local currency)', 'Amount (FX)', 'Amount (Checks)', 'Total amount', 'Verifier Name', 'Verifier Email', 'Created At', 'Updated At']
            let title = "Total Deposits Report"
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
                        totalDeposits: totalDeposits.reverse(),
                        header: `Total amount : $${totalAmountDeposited.length > 0 ? totalAmountDeposited[0].total : 0}`,
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
            if (findUser.accountType != "supervisor" && findUser.accountType != "admin") {
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
            const csvWriter = createCsvWriter({
                path: `reports/Total_deposits_Local_report_comapny_${findUser._id}.csv`,
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
                    { id: 'tellerName', title: 'Verifier Name' },
                    { id: 'tellerEmail', title: 'Verifier Email)' },
                    { id: 'dateCreated', title: 'Created At' },
                    { id: 'dateUpdated', title: 'Verified At' },
                ]
            });
            let headers = ['Sr.', 'Customer Name', 'Customer Email', 'Amount (Local currency)', 'Amount (X100)', 'Amount (X50)', 'Amount (X20)', 'Amount (X5)', 'Amount (Coins)', 'Amount (Checks)', 'Amount (FX)', 'Total Amount', 'Verifier Name', 'Verifier Email', 'Created At', 'Verified At']
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
            pdf.create(table, options).toFile(`reports/Total_deposits_Lcoal_report_company_${findUser._id}.pdf`, function (err, result) {
                if (err) {
                    throw (err)
                } else {
                    let userResponce = {
                        totalDepositsLocal: totalDeposits.reverse(),
                        header: `Total amount (Local Currency): $${totalAmountDepositedLocal}`,
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
            if (findUser.accountType != "supervisor" && findUser.accountType != "admin") {
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
                        totalDepositsFX: totalDeposits.reverse(),
                        header: `Total amount (FX): $${totalAmountDepositedFX}`,
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
            if (findUser.accountType != "supervisor" && findUser.accountType != "admin") {
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
                        totalDepositsChecks: totalDeposits.reverse(),
                        header: `Total amount (Checks): $${totalAmountDepositedChecks}`,
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
            if (findUser.accountType != "supervisor" && findUser.accountType != "admin") {
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
                        totalCustomers: totalCustomers.reverse(),
                        header: `Total customers : ${totalCustomers.length}`,
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
            if (findUser.accountType != "supervisor" && findUser.accountType != "admin") {
                let result = makeApiResponce('You cannot call this API', 1, BAD_REQUEST)
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
                        QRList: QrList.reverse(),
                        header: `Total QR codes generated: ${QrList.length}`,
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
            if (findUser.accountType != "supervisor" && findUser.accountType != "admin") {
                let result = makeApiResponce('Only supervisor can call this API', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }
            if (startingDate >= endingDate) {
                let result = makeApiResponce('Starting date must not to greater than or equal to ending date', 1, BAD_REQUEST)
                return res.status(BAD_REQUEST).json(result);
            }

            let customerList = await staffModel.aggregate([
                { $match: { accountType: 'customer' } },

                {
                    $lookup: {
                        from: 'qrsingles',
                        localField: '_id',
                        foreignField: 'customerID',
                        as: 'totalAmount',
                        pipeline: [
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
                <p style="text-align:center;">${req.body.startingDate} - ${req.body.endingDate}<span style="font-weight:bold;font-size:24px;margin-left:50px;margin-right:50px;">${title}</span>Total Customers: ${customerList.length > 0 ? customerList.length : 0}</p>
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
                        customerList: customerList.reverse(),
                        header: `Total Customers: ${customerList.length > 0 ? customerList.length : 0}`,
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
            if (findUser.accountType != "supervisor" && findUser.accountType != "admin") {
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
                        header: `Total Bags Processed : ${totalBagsProcessed.length > 0 ? totalBagsProcessed.length : 0}`,
                        totalBags: totalBags.reverse(),
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
            if (findUser.accountType != "supervisor" && findUser.accountType != "admin") {
                let result = makeApiResponce('You cannot call this API', 1, BAD_REQUEST)
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
                        allBags: totalBags.reverse(),
                        header: `Total Bags Processed : ${totalBagsProcessed.length > 0 ? totalBagsProcessed.length : 0}`,
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
            let totalBagsProcessed = await qrSingleMdel.find({ tellerID: findUser._id, clientID: findUser.company, ScannedByCustomer: true, ScannedByTeller: true, createdAt: { $gte: startingDate, $lte: endingDate } })
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
                        totalBagsByMe: totalBags.reverse(),
                        header: `Total Bags Processed : ${totalBagsProcessed.length > 0 ? totalBagsProcessed.length : 0}`,
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
                            totalInFX: { $sum: '$FX.value' },
                            totalInChecks: { $sum: '$checks.value' },
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
                            totalInFX: { $sum: '$FX.value' },
                            totalInChecks: { $sum: '$checks.value' },
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
                        totalDepositsByMe: totalDeposits.reverse(),
                        headetr: `Total amount : $${totalAmountDeposited.length > 0 ? totalAmountDeposited[0].total : 0}`,
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
            if (findUser.accountType != "supervisor") {
                let result = makeApiResponce('Onlu supervisor can call this API', 1, BAD_REQUEST)
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
                    totalInLocal: totalAmountDepositedLocal,
                    name: '',
                    email: '',
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
                        totalDepositsLocalByMe: totalDeposits.reverse(),
                        header: `Total amount (Local Currency): $${totalAmountDepositedLocal}`,
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
                        totalDepositsFXByMe: totalDeposits.reverse(),
                        header: `Total amount (FX): $${totalAmountDepositedFX}`,
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
            if (findUser.accountType != "supervisor") {
                let result = makeApiResponce('Only supervisor can call this API', 1, BAD_REQUEST)
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
                        totalDepositsChecksByMe: totalDeposits.reverse(),
                        header: `Total Amount (Checks) : ${totalAmountDepositedChecks}`,
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
};

