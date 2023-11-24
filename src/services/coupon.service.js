import Joi from 'joi'

export default {
    validateAddCouponSchema(body){
        const schema = Joi.object().keys({
            name: Joi.string().required(),
            description: Joi.string().optional(),
            service: Joi.string().optional(),
            code: Joi.string().optional(),
            statusBit: Joi.string().optional()
        });
        const { error, value } = Joi.validate(body, schema);
        if (error && error.details) {
            return { error };
        }
        return { value };
    },
    validateUpdateCouponSchema(body){
        const schema = Joi.object().keys({
            name: Joi.string().required(),
            description: Joi.string().optional(),
            service: Joi.string().optional(),
            code: Joi.string().optional(),
            statusBit: Joi.string().optional()
        });
        const { error, value } = Joi.validate(body, schema);
        if (error && error.details) {
            return { error };
        }
        return { value };
    },
  validateLoginSchema(body){
      const schema = Joi.object().keys({
          email: Joi.string()
            .email()
            .required(),
          password: Joi.string()
            .required()
        });
        const { error, value } = Joi.validate(body, schema);
        if (error && error.details) {
          return { error };
        }
        return { value };
  },
  validateChangePasswordSchema(body){
    const schema = Joi.object().keys({
        newPassword: Joi.string()
          .required(),
    });
      const { error, value } = Joi.validate(body, schema);
      if (error && error.details) {
        return { error };
      }
      return { value };
  },
  validatePhoneNumberSchema(body){
    const schema = Joi.object().keys({
        phoneNumber: Joi.string()
          .required(),
    });
      const { error, value } = Joi.validate(body, schema);
      if (error && error.details) {
        return { error };
      }
      return { value };
  },
  validateForgotPasswordSchema(body){
    const schema = Joi.object().keys({
        email: Joi.string()
          .email()
          .required(),
      });
      const { error, value } = Joi.validate(body, schema);
      if (error && error.details) {
        return { error };
      }
      return { value };
  },
};