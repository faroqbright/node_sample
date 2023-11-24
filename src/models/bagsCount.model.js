import mongoose from 'mongoose';

const { Schema } = mongoose;
const bagsCountSchema = new Schema({
    count: {
        type: Number,
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

export default mongoose.model('bagsCount', bagsCountSchema);
