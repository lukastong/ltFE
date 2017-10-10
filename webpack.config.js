const path = require('path');
const webpack = require('webpack');
const CompressionPlugin = require("compression-webpack-plugin");

const {LOCAL_DEV_IP, LOCAL_DEV_PORT, S3_RELEASE_URL} = require('./config');
const VERSION = require('./package.json').version;

const NODE_ENV = process.env.NODE_ENV;
const IS_PRODUCTION = 'production' === NODE_ENV;
const IS_BETA = 'beta' === NODE_ENV;
const IS_DEVELOPMENT = 'development' === NODE_ENV;
const hostAddress = `http://${LOCAL_DEV_IP}:${LOCAL_DEV_PORT}`;

console.log(`current NODE_ENV is ${NODE_ENV}`);
console.log(`current NODE_ENV is ${NODE_ENV}`);
console.log(`current NODE_ENV is ${NODE_ENV}`);

let webpackConfig = {
  entry: {
    app: ({
      production: ['babel-polyfill', './src/App.js'],
      beta: ['babel-polyfill', './src/App.js'],
      development: ['babel-polyfill', 'react-hot-loader/patch', './src/App.js'],
    }[NODE_ENV]),
  },
  output: {
    path: path.join(__dirname, 'release/dist'),
    filename: ({
      production: `[name].${VERSION}.[chunkhash:8].dist.js`,
      beta: `[name].beta.${VERSION}.[chunkhash:8].dist.js`,
      development: '[name].dist.js',
    }[NODE_ENV]),
    publicPath: ({
      production: `${S3_RELEASE_URL}/dist/`,
      beta: `${S3_RELEASE_URL}/dist/`,
      development: `${hostAddress}/dist/`,
    }[NODE_ENV]),
  },
  devServer: {
    contentBase: path.join(__dirname),
    compress: true,
    historyApiFallback: {
      index: './app.dev.html'
    },
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "X-Requested-With, content-type, Authorization"
    },
    host: LOCAL_DEV_IP,
    port: LOCAL_DEV_PORT,
    hot: true,
    inline: true
  },
  devtool: ({
    production: false,
    beta: false,
    development: 'cheap-source-map'
  }[NODE_ENV]),
  module: {
    rules: [{
      test: /\.(css)$/,
      use: [{
        loader: 'style-loader',
      }, {
        loader: 'css-loader',
        options: {
          modules: true,
          sourceMap: IS_DEVELOPMENT,
          importLoaders: 1,
          localIdentName: '[hash:base32:8]'
        }
      }, {
        loader: 'postcss-loader'
      }]
    }, {
      test: /\.(woff|woff2|ttf|eot|svg|otf)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
      loader: 'file-loader',
      options: {
        name: 'fonts/[hash].[ext]'
      }
    }, {
      test: /\.(txt|md)$/,
      use: 'raw-loader',
      exclude: /node_modules/,
    }, {
      test: /\.(mp3)$/,
      include: path.join(__dirname, 'src'),
      exclude: /node_modules/,
      loader: 'url-loader',
      options: {
        limit: 16384,
        name: 'audio/[hash].[ext]'
      }
    }, {
      test: /\.(png|jpg|gif|icon|ico)$/,
      include: path.join(__dirname, 'src'),
      exclude: /node_modules/,
      loader: 'url-loader',
      options: {
        limit: 65536,
        name: 'images/[hash].[ext]'
      }
    }, {
      test: /\.hbs$/,
      loader: 'handlebars-loader',
    }, {
      test: /\.(js|jsx)$/,
      include: path.join(__dirname, 'src'),
      exclude: /node_modules/,
      loader: 'babel-loader',
    }],
  },
  resolve: {
    alias: {
      config: path.resolve(__dirname, './config.js'),
    },
    modules: [
      path.resolve(path.join(__dirname, 'src')),
      path.resolve(path.join(__dirname, 'node_modules')),
    ],
  },
  plugins: (() => {

    let webpackPlugins = [
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(NODE_ENV),
        'process.env.VERSION': JSON.stringify(VERSION),
      })
    ];

    if (IS_PRODUCTION || IS_BETA) {

      webpackPlugins.push([
        new webpack.ContextReplacementPlugin(/moment[\/\\]locale$/, /en-gb|en-us/),
        new webpack.optimize.UglifyJsPlugin({
          output: {
            comments: false,
          },
          compressor: {
            sequences: false,     // join consecutive statemets with the “comma operator”
            properties: false,    // optimize property access: a['foo'] → a.foo
            dead_code: false,     // discard unreachable code
            drop_debugger: true,  // discard “debugger” statements
            unsafe: false,        // some unsafe optimizations (see below)
            conditionals: true,   // optimize if-s and conditional expressions
            comparisons: true,    // optimize comparisons
            evaluate: false,      // evaluate constant expressions
            booleans: true,       // optimize boolean expressions
            loops: true,          // optimize loops
            unused: true,         // drop unused variables/functions
            hoist_funs: true,     // hoist function declarations
            hoist_vars: true,     // hoist variable declarations
            if_return: true,      // optimize if-s followed by return/continue
            join_vars: true,      // join var declarations
            cascade: false,       // try to cascade `right` into `left` in sequences
            side_effects: false,  // drop side-effect-free statements
            warnings: true,       // warn about potentially dangerous optimizations/code
            global_defs: {},      // global definitions
          },
        }),
        new webpack.optimize.ModuleConcatenationPlugin(),
        new CompressionPlugin({
          asset: "[path].gz[query]",
          algorithm: "gzip",
          test: /\.js$|\.html$/,
          threshold: 10240,
          minRatio: 0.8
        }),
        new webpack.DllReferencePlugin({
          context: __dirname,
          manifest: require('./vendorDLL.json'),
        }),
      ])
    } else {
      webpackPlugins.push(
        new webpack.HotModuleReplacementPlugin(),
        new webpack.NamedModulesPlugin()
      );
    }

    return webpackPlugins;
  })(),
};

module.exports = webpackConfig;
