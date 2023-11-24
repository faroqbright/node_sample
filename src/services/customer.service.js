import Joi from 'joi'

export default {
  //////// Update customer ///////
validateUpdateCustomerSchema(body){
    const schema = Joi.object().keys({
        firstName: Joi.string().optional(),
        statusBit: Joi.boolean().optional()
    });
    const { error, value } = Joi.validate(body, schema);
    if (error && error.details) {
        return { error };
    }
    return { value };
},
validateUpdateCustomerStatusSchema(body){
    const schema = Joi.object().keys({
        statusBit: Joi.boolean().required()
    });
    const { error, value } = Joi.validate(body, schema);
    if (error && error.details) {
        return { error };
    }
    return { value };
},
};