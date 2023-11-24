import mongoose from 'mongoose';

const { Schema } = mongoose;
const qrSingleSchema = new Schema({
    qrBatch: {
        type: Schema.Types.ObjectId,
        ref: 'qr',
        required: true
    },
    clientID: {
        type: Schema.Types.ObjectId,
        ref: 'company',
        required: true
    },
    customerID: {
        type: Schema.Types.ObjectId,
        ref: 'Staff',
        required: true
    },
    tellerID : {
        type: Schema.Types.ObjectId,
        ref: 'Staff',
    },
    bagID: {
        type: String,
        required : true
    },
    ScannedByCustomer: {
        type: Boolean,
        default : false
    },
    ScannedByTeller: {
            type:Boolean,
            default : false
    },
    notes : {
        type: Object,
    },
    total: {
        value : {
        type: Number,
        default : 0,
        },
        status : {
        type: Boolean,
        default : false,
        },
    },
    checks: {
        type: Array,
        default : []
    },
    Xcd: {
        type: Array,
        default : []
    },
    FX: {
        type: Array,
        default : []
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

export default mongoose.model('qrSingle', qrSingleSchema);
