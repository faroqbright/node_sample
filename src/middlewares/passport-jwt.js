import  PassportJWT  from 'passport-jwt'
import  passport  from 'passport'
import  UserModel  from '../models/user.model.js'
import { devConfig } from '../config/config.js' 

export const configureJWTStartegy = () => {

    var opts = {}
    opts.jwtFromRequest = PassportJWT.ExtractJwt.fromAuthHeaderAsBearerToken();
    opts.secretOrKey = devConfig.secret;

    passport.use(
        new PassportJWT.Strategy(opts, function(payload, done) {
            // console.log(payload);
            UserModel.findOne({_id: payload.id}, function(err, user) {
                if (err) {
                    return done(err, false);
                }
                if (user) { 
                    return done(null, user);
                } else {
                    return done(null, false);
                    // or you could create a new account
                }
            });
        })
    );
};
