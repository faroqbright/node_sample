import mongoose from 'mongoose';

const { Schema } = mongoose;
const PropertySchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
      type: String,
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
    city: {
      type: String,
      default: null
    },
    state: {
      type: String,
      default: null,
    },
    zipCode: {
      type: String,
      default: null,
    },
    floors: {
      type: String,
      default: null,
    },
    basement: {
      type: Boolean,
      default: false,
    },
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

export default mongoose.model('Property', PropertySchema);
