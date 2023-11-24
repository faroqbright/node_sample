import multer, { diskStorage } from "multer";
// import { sync } from "mkdirp";
const { sync } = require("mkdirp");
import { devConfig } from '../config/config.js';

//path where images gonna save
var upload_dir = 'uploads';

var storage = diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname == "profileImage") {
      upload_dir = `${devConfig.imagesPath.userImage}`
    }
    if (file.fieldname == "profilePic") {
      upload_dir = `${devConfig.imagesPath.userImage}`
    }

    if (file.fieldname == "image") {
      upload_dir = `${devConfig.imagesPath.couponImage}`
    }

    if (file.fieldname == "csvFile") {
      upload_dir = `${devConfig.docsPath.csvFiles}`
    }

    sync(upload_dir); //create directories if not exist
    cb(null, upload_dir);
  },
  filename: (req, file, cb) => {
    var originalname = file.originalname;
    var extension = originalname.split(".");
    let filename =
      file.fieldname + "-" + Date.now() + "." + extension[extension.length - 1]; // file save with original extension
    cb(null, filename);
  }
});

var upload = multer({
  storage: storage
});
// export default upload;
export default upload;
