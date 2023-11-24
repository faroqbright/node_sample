import mongoose from 'mongoose';

const { Schema } = mongoose;
const OrderDetail = new Schema({
order: {
        type: Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
service: {
        type: Schema.Types.ObjectId,
        ref: 'Service',
        required: true
    },
serviceName: {
        type: String,
        default: null
    },
serviceType: {
        type: String,
        default: null
    },
property: {
        type: Schema.Types.ObjectId,
        ref: 'Property',
        required: true
    },
roomType: {
        type: String,
        default: null,
    },
distanceFromGround: {
        type: String,
        default: null,
    },
floorType: {
        type: String,
        default: null,
    },
measureType: {
        type: String,
        default: null,
    },
width: {
        type: String,
        default: null,
    },
height: {
        type: String,
        default: null,
    },
currectMeasurement:{
        type:Boolean,
        default:false
    },
images: [{
        type: String,
        default: null,
    }],
temperedGlassType: {
        type: String,
        default: null,
    },
glassType: {
        type: String,
        default: null,
    },
designType: {
        type: String,
        default: null,
    },
colorSelection: {
        type: String,
        default: null,
    },
styleSelection: {
        type: String,
        default: null,
    },
openingType: {
        type: String,
        default: null,
    },
openingDirection: {
        type: String,
        default: null,
    },
totalAmount: {
        type: Number,
        default: null,
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

export default mongoose.model('OrderDetail', OrderDetail);
