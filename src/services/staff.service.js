import Joi from 'joi'

export default {
  validateRegisterClientSchema(body) {
    const schema = Joi.object().keys({
      clientName: Joi.string().optional(),
      clientAbbrevation: Joi.string().optional(),
      clientCountry: Joi.string().optional(),
      clientEmail: Joi.string().email(),
      image: Joi.string().optional(),
    });
    const { error, value } = Joi.validate(body, schema);
    if (error && error.details) {
      return { error };
    }
    return { value };
  },

  validateRegisterClientAdminSchema(body) {
    const schema = Joi.object().keys({
      company: Joi.string().optional(),
      name: Joi.string().optional(),
      password: Joi
        .string()
        .min(8)
        .regex(/^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])[0-9a-zA-Z!@#$%^&*]*$/),
      email: Joi.string().email(),
    });
    const { error, value } = Joi.validate(body, schema);
    if (error && error.details) {
      return { error };
    }
    return { value };
  },
  validateEditProfileSchema(body) {
    const schema = Joi.object().keys({
      name: Joi.string().optional(),
      phoneNumber: Joi.string().optional()
    });
    const { error, value } = Joi.validate(body, schema);
    if (error && error.details) {
      return { error };
    }
    return { value };
  },

  validateSetupParametersSchema(body) {
    const schema = Joi.object().keys({
      name: Joi.string().optional(),
      email: Joi.string().email().optional(),
      country: Joi.string().optional(),
      abbreviation: Joi.string().optional(),
      second_email: Joi.string().optional(),
      localCurrency: Joi.optional(),
      FXAllowed: Joi.array().optional(),
      image: Joi.string().optional(),

    });
    const { error, value } = Joi.validate(body, schema);
    if (error && error.details) {
      return { error };
    }
    return { value };
  },

  validateRegisterSupervisorTelerSchema(body) {
    const schema = Joi.object().keys({
      company: Joi.string().optional(),
      name: Joi.string().optional(),
      email: Joi.string().email().optional(),
      password: Joi
        .string()
        .min(8)
        .regex(/^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])[0-9a-zA-Z!@#$%^&*]*$/),
      employeeType: Joi.string(),
    });
    const { error, value } = Joi.validate(body, schema);
    if (error && error.details) {
      return { error };
    }
    return { value };
  },

  validateStaffLoginSchema(body) {
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

  validateStaffLoginSchemaForWeb(body) {
    const schema = Joi.object().keys({
      email_address: Joi.string()
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

  validateChangeCustomerCredsSchema(body) {
    const schema = Joi.object().keys({
      email: Joi.string().optional().email(),
      password: Joi
        .string()
        .allow('')
        .optional()
        .min(8)
        .regex(/^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])[0-9a-zA-Z!@#$%^&*]*$/)
        .optional(),
      type: Joi.string().optional(),
      _id: Joi.string().optional()
    });
    const { error, value } = Joi.validate(body, schema);
    if (error && error.details) {
      return { error };
    }
    return { value };
  },

  validateChangePasswordSchema(body) {
    const schema = Joi.object().keys({
      oldPassword: Joi
        .string()
        .min(8)
        .regex(/^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])[0-9a-zA-Z!@#$%^&*]*$/),

      newPassword: Joi
        .string()
        .min(8)
        .regex(/^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])[0-9a-zA-Z!@#$%^&*]*$/),

      confirmPassword: Joi
        .string()
        .min(8)
        .regex(/^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])[0-9a-zA-Z!@#$%^&*]*$/),
    });
    const { error, value } = Joi.validate(body, schema);
    if (error && error.details) {
      return { error };
    }
    return { value };
  }
}

