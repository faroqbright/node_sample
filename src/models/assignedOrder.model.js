import mongoose from 'mongoose';

const { Schema } = mongoose;
const AssignedOrder = new Schema({
order: {
        type: Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
userBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
userTo: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
assignedDate:{
    type:Date,
    default: null
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

export default mongoose.model('AssignedOrder', AssignedOrder);
