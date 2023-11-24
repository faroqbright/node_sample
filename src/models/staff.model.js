import mongoose from 'mongoose';

const { Schema } = mongoose;
const StaffSchema = new Schema({
  // user: {
  //     type: Schema.Types.ObjectId,
  //     ref: 'User',
  //     required: true
  // },
  company: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
  },
  email: {
    type: String,
    default: null,
  },
  name: {
    type: String,
    default: null,
  },
  phoneNumber: {
    type: String,
    default: null,
  },
  accountNumber: {
    type: String,
    default: null,
  },
  password: {
    type: String,
  },
  image: {
    type: String,
    default: null,
  },
  accountType: {
    type: String,
    default: 'customer',
  },
  fcm: {
    type: String
  }

},
  { timestamps: true }
);

export default mongoose.model('Staff', StaffSchema);
