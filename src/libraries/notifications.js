var FCM = require('fcm-node');
var serverKey = 'AAAAPl6CbTc:APA91bFEgY3J5Wd8MRuJmEmOl16vCaXjItxHFJKiiyt7DNpzPuQmDQJSsruDPov3vz5IWpf-lFLBAnjnJMSXVw1mLEWi_W_gOoSo1vcHRSOJM5impRmUglLo6SNXU538_ENdBdJdn00v'; //LIVE ALI Key
var fcm = new FCM(serverKey);
// var UsereModel = require('../models/user.model');
// NOTIFICATION FUNCTION 
const push_notification = async (notification_title, notification_msg, device_token, count = 0) => {
    //   let action_user = await UsereModel.findOne({_id: action_id});
    var message = {
        to: device_token,
        collapse_key: 'your_collapse_key',
        notification: {
            title: notification_title,
            body: notification_msg
        },
        data: {
            count: count,
        }
    };
    fcm.send(message, function (err, response) {
        if (err) {
            console.log(err);
            console.log("Something has gone wrong!");
        } else {
            console.log("Successfully sent with response: ", response);
        }
    });
};
module.exports = {
    push_notification
}