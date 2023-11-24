import mongoose from 'mongoose';

const { Schema } = mongoose;
const ProductSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    service: {
        type: Schema.Types.ObjectId,
        ref: 'Service',
        required: true
    },
    product_id: {
      type: String,
      default: null
    },
    job_type: {
      type: String,
      default: null
    },
    color: {
          type: String,
          default: null,
    },
    grid: {
        type: String,
        default: null,
    },
    open_type: {
        type: String,
        default: null,
    },
    tempered_glass: {
        type: String,
        default: null,
    },
    privacy: {
        type: String,
        default: null,
    },
    safety_glass: {
        type: String,
        default: null,
    },
    dimension_class: {
        type: String,
        default: null,
    },
    price: {
        type: String,
        default: null,
    },
    delBit: {
      type: Boolean,
      default: false,
    },

  },
  { timestamps: true }
  );

export default mongoose.model('Product', ProductSchema);
