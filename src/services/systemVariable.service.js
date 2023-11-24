import Joi from 'joi'
export default {
        validateUpdateSystemVariableSchema(body){
            const schema = Joi.object().keys({
                reliPortion: Joi.number().min(0).max(100).required(),
                materialSurcharge: Joi.number().min(0).max(100).required(),
                windowsPermitFee: Joi.number().required(),
                windowsDeliveryFee: Joi.number().required(),
                slidingGlassDoorPermitFee: Joi.number().required(),
                slidingGlassDoorDeliveryFee: Joi.number().required(),
                interiorDoorPermitFee: Joi.number().required(),
                interiorDoorDeliveryFee: Joi.number().required(),
            });
            const { error, value } = Joi.validate(body, schema);
            if (error && error.details) {
                return { error };
            }
            return { value };
        }
};