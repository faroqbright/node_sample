import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import crypto from 'crypto'
import { devConfig } from '../config/config.js';
import axios from 'axios'
export const sendNotification = async (to, message, jsonData) => {
  await axios
    .post(
      "https://fcm.googleapis.com/fcm/send",
      {
        to,
        priority: "high",
        notification: {
          title: message.title,
          body: message.body,
        },
        android: {
          priority: "high",
        },
        data: jsonData,
        apns: {
          headers: {
            "apns-priority": 5,
            "apns-topic": "com.demo",
            "apns-push-type": "background",
          },
        },
      },
      {
        headers: {
          Authorization: "key=" + process.env.FCM_API_KEY,
        },
      }
    )
    .then((resp) => console.log("Notification sent: ", resp.data));
};
export const getJWTToken = async payload => {
  const token = jwt.sign(
    payload,
    devConfig.secret, {
    expiresIn: '365d',
  }
  );
  return token;
};

export const decode = async token => {
  var decoded = jwt.verify(token, devConfig.secret);
  return decoded.id
};

export const getEncryptedPassword = async password => {
  const salt = await bcryptjs.genSalt();
  const hash = await bcryptjs.hash(password, salt);
  return hash;
};

export const gnerarteQrCode = async () => {
  const qr_crypto = crypto.randomBytes(24);
  const qr_code_hex = qr_crypto.toString("Hex");
  return qr_code_hex
};


export const randomValueHex = async (len) => {

  let randomstring = crypto.randomBytes(Math.ceil(len / 2))
    .toString('hex') // convert to hexadecimal format
    .slice(0, len).toUpperCase();   // return required number of characters
  return randomstring;
}

export const makeid = (length) => {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
}
