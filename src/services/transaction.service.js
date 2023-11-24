import Joi from 'joi'

export default {
  //////// Refund Transaction ///////
    validateRefundTransactionSchema(body){
    const schema = Joi.object().keys({
        orderId: Joi.string().required(),
        refundAmount: Joi.number().min(1).max(1000).required(),
    });
    const { error, value } = Joi.validate(body, schema);
    if (error && error.details) {
        return { error };
    }
    return { value };
},
};