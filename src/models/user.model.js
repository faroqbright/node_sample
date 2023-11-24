import mongoose from 'mongoose';

const { Schema } = mongoose;
const UserSchema = new Schema({
  email: {
    type: String,
    required: true,
    lowercase: true
  },
  clientID: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  profileImage: {
    type: String,
    default: null
  },
  firstName: {
    type: String,
    default: null
  },
  lastName: {
    type: String,
    default: null
  },
  userType: {
    type: String,
    default: null,
  },
  password: {
    type: String,
    default: null
  },
  address: {
    type: String,
    default: null
  },
  appartment: {
    type: String,
    default: null
  },
  willingRange: {
    type: String,
    default: null
  },
  zipCode: {
    type: String,
    default: null
  },
  state: {
    type: String,
    default: null
  },
  city: {
    type: String,
    default: null
  },
  country: {
    type: String,
    default: null
  },
  phoneNumber: {
    type: String,
    default: null
  },
  abbrevation: {
    type: String,
    default: null
  },
  otp: {
    type: String,
    default: "1234"
  },
  services: [
    {
      type: String,
      default: null
    }
  ],
  location: {
    type: {
      type: String,
      default: 'Point',
      enum: ['Point']
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    }
  },
  stripeCustomerId: {
    type: String,
    default: null
  },
  statusBit: {
    type: Boolean,
    default: false
  },
  delBit: {
    type: Boolean,
    default: false,
  },
  lastLoginAt: {
    type: Date,
    default: Date.now()
  },
  company: {
    type: Schema.Types.ObjectId,
    ref: 'Company'
  },
  accountType: {
    type: String,
    default: 'standard_contractor',
  },
  newMessageFromCustomerNoti: {
    type: Boolean,
    default: false
  },
  newOrder: {
    type: Boolean,
    default: false
  },
  upcomingDelivery: {
    type: Boolean,
    default: false
  },
  newMessageFromCustomerEmail: {
    type: Boolean,
    default: false
  },
  projectUpdates: {
    type: Boolean,
    default: false
  },
  cancellation: {
    type: Boolean,
    default: false
  },
  rescheduleRequest: {
    type: Boolean,
    default: false
  },
  reminders: {
    type: Boolean,
    default: false
  },
  fcmToken: {
    type: String,
    default: null
  },
},
  { timestamps: true }
);

UserSchema.index({ location: '2dsphere' });

export default mongoose.model('User', UserSchema);
