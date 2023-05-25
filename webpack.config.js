const nodeExternals = require("webpack-node-externals");
module.exports = [
  {
    mode: "production",
    entry: ["./express-server.js"],
    output: {
      filename: "./bin/index-bundle.js"
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: [/node_modules/, /mobile_controllers/, /mobile_routes/],
          loader: "babel-loader",
          query: {
            presets: ["@babel/preset-env"],
            compact: false
          }
        },
        {
          test: /\.csv$/,
          loader: "csv-loader",
          options: {
            dynamicTyping: true,
            header: true,
            skipEmptyLines: true
          }
        }
      ]
    },
    devServer: {
      inline: true,
      port: 4000
    },
    target: "node",
    externals: [nodeExternals()],
    watch: false
  },
  {
    mode: "production",
    entry: ["./express-server_mobile.js"],
    output: {
      filename: "./bin/mob_index-bundle.js"
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: [/node_modules/,/routes/],
          loader: "babel-loader",
          query: {
            presets: ["@babel/preset-env"],
            compact: false
          }
        },
        {
          test: /\.csv$/,
          loader: "csv-loader",
          options: {
            dynamicTyping: true,
            header: true,
            skipEmptyLines: true
          }
        }
      ]
    },
    devServer: {
      inline: true,
      port: 4001
    },
    target: "node",
    externals: [nodeExternals()],
    watch: false
  }
];
