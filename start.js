
require("@babel/register")({
    presets: ["@babel/preset-env"],
    "plugins": [
        ["@babel/transform-runtime"]
    ]
  });

if(process.argv[2]==='web'){
    module.exports = require('./express-server.js')
}else{
    module.exports = require('./express-server_mobile.js')
}
  