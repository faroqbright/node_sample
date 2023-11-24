import mongoose from 'mongoose';

const { Schema } = mongoose;
const ServiceSchema = new Schema({
    name: {
      type: String,
      default: null
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

export default mongoose.model('Service', ServiceSchema);
