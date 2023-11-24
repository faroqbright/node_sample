import mongoose from 'mongoose';

const { Schema } = mongoose;
const OrderAccepted = new Schema({
user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
},
order: {
    type: Schema.Types.ObjectId,
    ref: 'Order',
    required: true
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

export default mongoose.model('OrderAccepted', OrderAccepted);
