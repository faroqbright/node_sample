import mongoose from 'mongoose';

const { Schema } = mongoose;
const bagRequest = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'staffs',
        required: true
    },
    reason: {
        type: String,
        default: null,
        required: true
    },
    notes: {
        type: String,
        default: null,
    },
    bagsCount: {
        type: Number,
        default: 0,
        required: true
    },
    pickupLocation: {
        type: String,
        default: null,
    },
    statusBit: {
        type: Boolean,
        default: false
    },
    // delBit: {
    //     type: Boolean,
    //     default: false,
    //     }
},
    { timestamps: true }
);

export default mongoose.model('bagrequest', bagRequest);
