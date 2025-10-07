const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const Dotenv = require('dotenv-webpack');
const TerserPlugin = require('terser-webpack-plugin');
const nodeExternals = require('webpack-node-externals');


const cssLoader = {
  loader: 'css-loader'
};

const postcssLoader = {
  loader: 'postcss-loader',
  options: {
    postcssOptions: {
      plugins: [
        'autoprefixer'
      ]
    }
  }
};

module.exports = function (env, { analyze }) {
  const production = env.production || process.env.NODE_ENV === 'production';

  const entry = production
    ? {
      helloworld: './src/helloworld/index.js',
      chartjsgeo: './src/chartjsgeo/index.js',
      chartjs: './src/chartjs/index.js',
      pgxchart: './src/pgxchart/index.js',
    }
    : {
      entry: './dev-app/main.js'
    };


  return {
    target: production ? 'web' : 'web',
    mode: production ? 'production' : 'development',
    devtool: production ? undefined : 'eval-source-map',
    optimization: {

      minimizer: [
        new TerserPlugin({
          terserOptions: {
            // Terser fast minify mode
            // https://github.com/terser-js/terser#terser-fast-minify-mode
            // It's a good balance on size and speed to turn off compress.
            // Also bypass some terser bug.
            compress: false
          },
        }),
      ],
      splitChunks: {
        chunks: 'all', // split all types of chunks (async & initial)
        name: 'shared',  // this will create shared.js with common modules
        minChunks: 2,   // included in shared chunk if used in 2+ entries
      }
    },
    entry,//: {
    // Build only plugin in production mode,
    // build dev-app in non-production mode
    //entry:  production? './src/index.js' : './dev-app/main.js',
    //},
    output: {
      clean: true,
      path: path.resolve(__dirname, 'dist'),
      filename: production ? '[name].js' : '[name].bundle.js',
      //library: production ? { type: 'commonjs' } : undefined,
      environment: {
        arrowFunction: true,
        const: true,
        destructuring: true,
        forOf: true,
        dynamicImport: true,
        optionalChaining: true,
        templateLiteral: true
      }
    },
    resolve: {
      extensions: ['.js'],
      modules: [path.resolve(__dirname, 'src'), path.resolve(__dirname, 'dev-app'), 'node_modules'],
      alias: production ? {
        // add your production aliases here
      } : {
        ...getAureliaDevAliases()
        // add your development aliases here
      }
    },
    devServer: {
      historyApiFallback: true,
      open: !process.env.CI,
      port: 9000,
      static: {
        directory: path.resolve(__dirname, 'static'), // Serve static files from 'static' folder
        publicPath: '/static', // Optional: access static files under /static
        watch: true
      }
    },
    module: {
      rules: [
        { test: /\.(png|svg|jpg|jpeg|gif)$/i, type: 'asset' },
        { test: /\.(woff|woff2|ttf|eot|svg|otf)(\?v=[0-9]\.[0-9]\.[0-9])?$/i, type: 'asset' },
        {
          test: /\.css$/i,
          // For style loaded in src/main.js, it's not loaded by style-loader.
          // It's for shared styles for shadow-dom only.
          issuer: /[/\\]src[/\\]main\.(js|ts)$/,
          use: [cssLoader, postcssLoader]
        },
        {
          test: /\.css$/i,
          // For style loaded in other js/ts files, it's loaded by style-loader.
          // They are directly injected to HTML head.
          issuer: /(?<![/\\]src[/\\]main)\.(js|ts)$/,
          use: ['style-loader', cssLoader, postcssLoader]
        },
        {
          test: /\.css$/i,
          // For style loaded in html files, Aurelia will handle it.
          issuer: /\.html$/,
          use: [cssLoader, postcssLoader]
        },
        { test: /\.js$/i, use: ['babel-loader', '@aurelia/webpack-loader'], exclude: /node_modules/ },
        {
          test: /[/\\](?:src|dev-app)[/\\].+\.html$/i,
          use: {
            loader: '@aurelia/webpack-loader',
            options: {
              // The other possible Shadow DOM mode is 'closed'.
              // If you turn on "closed" mode, there will be difficulty to perform e2e
              // tests (such as Playwright). Because shadowRoot is not accessible through
              // standard DOM APIs in "closed" mode.
              defaultShadowOptions: { mode: 'open' }
            }
          },
          exclude: /node_modules/
        }
      ]
    },
    externalsPresets: { node: production },
    externals: production ? undefined : [
      // Skip npm dependencies in plugin build.
      production && nodeExternals()
    ].filter(p => p),
    plugins: [
      !production && new HtmlWebpackPlugin({ template: 'index.html', favicon: 'favicon.ico' }),
      new Dotenv({
        path: `./.env${production ? '' : '.' + (process.env.NODE_ENV || 'development')}`,
      }),
      analyze && new BundleAnalyzerPlugin()
    ].filter(p => p)
  }
}

function getAureliaDevAliases() {
  return [
    'aurelia',
    'fetch-client',
    'kernel',
    'metadata',
    'platform',
    'platform-browser',
    'route-recognizer',
    'router',
    'router-lite',
    'runtime',
    'runtime-html',
    'testing',
    'state',
    'ui-virtualization'
  ].reduce((map, pkg) => {
    const name = pkg === 'aurelia' ? pkg : `@aurelia/${pkg}`;
    try {
      const packageLocation = require.resolve(name);
      map[name] = path.resolve(packageLocation, `../../esm/index.dev.mjs`);
    } catch {/**/ }
    return map;
  }, {});
}
