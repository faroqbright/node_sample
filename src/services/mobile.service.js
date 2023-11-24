import Joi from 'joi'

export default {

    validateDeposit(body) {
        const schema = Joi.object().keys({
            bagID: Joi.string().required(),
            customerID: Joi.string().required(),
            clientID: Joi.string().required(),
            total: Joi.object().required(),
            Xcd: Joi.array().required(),
            checks: Joi.array().required(),
            FX: Joi.array().required(),

        });
        const { error, value } = Joi.validate(body, schema);
        if (error && error.details) {
            return { error };
        }
        return { value };
    },
};