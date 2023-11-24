import mongoose from 'mongoose';

const { Schema } = mongoose;
const qrSchema = new Schema({
    customerID: {
        type : String,
        required: true
    },
    clientID: {
        type : String,
        required: true
    },
    bagsCount: {
        type : String,
        required: true
    },
    customerName: {
        type : String,
        required: true
    },
    bagID: {
        type : Array,
    },
    lastPrinted: {
        type : Date,
        default : null,
    },
    statusBit: {
        type: Boolean,
        default: true
    },
    delBit: {
      type: Boolean,
      default: false,
    }
  },
  { timestamps: true }
  );

export default mongoose.model('qrBatches', qrSchema);
