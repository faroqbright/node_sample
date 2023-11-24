import mongoose from 'mongoose';

const { Schema } = mongoose;
const CompanySchema = new Schema({
    companyName: {
      type: String,
      default: null
    },
    abbrevation: {
      type: String,
      default: null
    },
    country: {
      type: String,
      default: null
    },
    email: {
      type: String,
      default: null
    },
    second_email: {
      type: String,
      default: null
    },
    localCurrency: {
      type: String,
      default: null
    },
    FXAllowed: {
      type: Array,
      default: null
    },
    addressOne: {
      type: String,
      default: null
    },
    addressTwo: {
      type: String,
      default: null,
    },
    companyStatus: {
      type: String,
      default: 'active'
    },
    distanceWillingTravel: {
      type: String,
      default: null,
    },
    representativeName: {
      type: String,
      default: null,
    },
    representativeNumber: {
      type: String,
      default: null,
    },
    representativeEmail: {
      type: String,
      default: null,
    },
    services: [
      {
          type: String,
          default: null
      }
    ],
    statusBit: {
        type: Boolean,
        default: true
    },
    image: {
        type: String,
        default: null,
    },
    delBit: {
      type: Boolean,
      default: false,
    }
  },
  { timestamps: true }
  );

export default mongoose.model('Company', CompanySchema);
