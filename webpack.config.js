'use strict';

const webpack = require("webpack");

module.exports = {
  context: __dirname,
  entry: {
    index: "./index.js",
  },
  output: {
    path: __dirname + "/dist",
    filename: "[name].bundle.js",
    publicPath: "/dist"
  },
  devServer: {
    contentBase: __dirname,
  }
};
