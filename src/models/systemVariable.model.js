import mongoose from 'mongoose';

const { Schema } = mongoose;
const SystemVariableSchema = new Schema({
    reliPortion: {
      type: String,
      default: 0.00
    },
    materialSurcharge: {
      type: String,
      default: 0.00
    },
    windowsPermitFee: {
      type: String,
      default: 0.00,
    },
    windowsDeliveryFee: {
        type: String,
        default: 0.00,
    },
    slidingGlassDoorPermitFee: {
        type: String,
        default: 0.00,
    },
    slidingGlassDoorDeliveryFee: {
        type: String,
        default: 0.00,
    },
    interiorDoorPermitFee: {
        type: String,
        default: 0.00,
    },
    interiorDoorDeliveryFee: {
        type: String,
        default: 0.00,
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

export default mongoose.model('SystemVariable', SystemVariableSchema);
