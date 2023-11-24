import Joi from 'joi'

export default {
    validateAddCompanySchema(body){
        const schema = Joi.object().keys({
          companyName: Joi.string().required(),
          addressOne: Joi.string().optional(),
          addressTwo: Joi.string().optional(),
          companyStatus: Joi.string().optional(),
          distanceWillingTravel: Joi.string().optional(),
          representativeName: Joi.string().optional(),
          representativeNumber: Joi.string().optional(),
          representativeEmail: Joi.string().email().required(),
          services: Joi.optional(),
          statusBit: Joi.string().optional()
        });
        const { error, value } = Joi.validate(body, schema);
        if (error && error.details) {
            return { error };
        }
        return { value };
    },
    validateUpdateCompanySchema(body){
        const schema = Joi.object().keys({
          companyName: Joi.string().required(),
          addressOne: Joi.string().optional(),
          addressTwo: Joi.string().optional(),
          companyStatus: Joi.string().optional(),
          distanceWillingTravel: Joi.string().optional(),
          representativeName: Joi.string().optional(),
          representativeNumber: Joi.string().optional(),
          representativeEmail: Joi.string().email().required(),
          services: Joi.optional(),
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