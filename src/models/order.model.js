import mongoose from 'mongoose';

const { Schema } = mongoose;
const Order = new Schema({
    user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
    orderAccepted: {
        type: Schema.Types.ObjectId,
        ref: "OrderAccepted",
        default: null
    },
    name:{
        type:String,
        default:null
    },
    email:{
        type:String,
        default:null
    },
    cardHolderName:{
        type:String,
        default:null
    },
    // country:{
    //     type:String,
    //     default:null
    // },
    // city:{
    //     type:String,
    //     default:null
    // },
    // postcode:{
    //     type:String,
    //     default:null
    // },
    // addressLine1:{
    //     type:String,
    //     default:null
    // },
    // addressLine2:{
    //     type:String,
    //     default:null
    // },
    cardBrand:{
        type:String,
        default:null
    },
    cardlast4:{
        type:String,
        default:null
    },
    cardExpMonth:{
        type:String,
        default:null
    },
   cardExpYear:{
        type:String,
        default:null
    },
    cardCvc:{
        type:String,
        default:null
    },
    // stripeCustomerId:{
    //     type:String,
    //     default:null
    // },
   stripePaymentId:{
        type:String,
        default:null
   },
   subTotalAmount:{
        type: Number,
        default: null,
    },
  discountAmount:{
      type: Number,
      default: null,
  },
    totalAmount:{
        type: Number,
        default: null,
    },
    statusBit:{
        type: Boolean,
        default: true
    },
    orderStatus:{
        type: String,
        required: true,
        default: 'Pending'
    },
    orderStatusDate:{
        type:Date,
        default: null
    },
    requestStatus:{
        type: String,
        required: true,
        default: 'Pending'
    },
    dateSelection:[{
        type:String,
        default:null
    }],
    stripeRefundId:{
        type:String,
        default:null
    },
    stripeBalanceTransactionId:{
        type:String,
        default:null
    },
    refundAmount:{
        type: Number,
        default: null,
    },
    refundDate:{
        type:Date,
        default: null
    },
    delBit: {
            type: Boolean,
            default: false,
        }
        },
        { timestamps: true }
            );

export default mongoose.model('Order', Order);
