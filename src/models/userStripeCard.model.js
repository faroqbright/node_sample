import mongoose from 'mongoose';

const { Schema } = mongoose;
const UserStripeCard = new Schema({
    user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
    stripeCardHolderName:{
        type:String,
        default:null
    },
   stripeCardId:{
            type:String,
            default:null
        },
    stripeCardBrand:{
        type:String,
        default:null
    },
    stripeCardlast4:{
        type:String,
        default:null
    },
    stripeCardExpMonth:{
        type:String,
        default:null
    },
   stripeCardExpYear:{
        type:String,
        default:null
    },
    stripeCardCvc:{
        type:String,
        default:null
    },
    statusBit:{
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

export default mongoose.model('UserStripeCard', UserStripeCard);
