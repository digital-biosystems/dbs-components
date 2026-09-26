const path = require('path');
const webpack = require('webpack');
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
  const myapp = env.myapp || false;

  if (myapp) {
    return buildMyApp({ analyze });
  }

  const entry = production
    ? {
      'dbs-helloworld': './src/helloworld/index.js',
      'dbs-chartjsgeo': './src/chartjsgeo/index.js',      
      'dbs-fmi': './src/chartjs/index.js',  
      'dbs-webllmchat': './src/webllmchat/index.js',  
      'dbs-pgxbadge': './src/pgxbadge/index.js',  
      'dbs-kbsearch': './src/kbsearch/index.js',
      'dbs-buttonparams': './src/buttonparams/index.js',
      'dbs-guidedslides': './src/guidedslides/index.js',
      'dbs-value': './src/value/index.js',
      'dbs-summary': './src/summary/index.js',
      'dbs-table': './src/table/index.js',
      'dbs-quadrisgame': './src/quadrisgame/index.js',
      'dbs-fmusim': './src/fmusim/index.js',
      'dbs-bundle': [
        './src/helloworld/index.js',
        //'./src/chartjsgeo/index.js',        
        './src/chartjs/index.js',
        //'./src/webllmchat/index.js',
        './src/pgxbadge/index.js',
        './src/buttonparams/index.js',
        './src/guidedslides/index.js',
        './src/value/index.js',
        './src/summary/index.js',
        //'./src/kbsearch/index.js',
        './src/table/index.js'
      ],
      'dbs-full-bundle': [
        './src/helloworld/index.js',
        './src/chartjsgeo/index.js',        
        './src/chartjs/index.js',
        './src/webllmchat/index.js',
        './src/pgxbadge/index.js',
        './src/buttonparams/index.js',
        './src/guidedslides/index.js',
        './src/value/index.js',
        './src/summary/index.js',
        './src/kbsearch/index.js',
        './src/table/index.js'
      ]    
    }
    : {
      entry: './dev-app/main.js'
    };


  return {
    target: production ? 'web' : 'web',
    mode: production ? 'production' : 'development',
    devtool: production ? undefined : 'eval-source-map',
    optimization: {
      //minimize: false,
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
    chunks: chunk => {
      // Exclude the 'bundle' chunk from splitChunks processing
      if (chunk.name === 'dbs-bundle' || chunk.name === 'dbs-full-bundle') {
        return false; // exclude 'bundle' chunk
      }
      if (chunk.name === 'dbs-full-bundle') {
        return false; // exclude 'bundle' chunk
      }
      return true; // include other chunks
    },
    name: 'dbs-shared',
    minChunks: 2,
    cacheGroups: {
      default: false, // disable defaults if you want full control
      vendors: false,
      common: {
        name: 'dbs-shared',
        chunks: chunk => (chunk.name !== 'dbs-bundle' && chunk.name !== 'dbs-full-bundle'), // exclude 'bundle' chunk
        minChunks: 2,
        priority: 10,
        reuseExistingChunk: true,
        enforce: true
      }
    }
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
      },
      fullySpecified: false
    },
    devServer: {
      historyApiFallback: true,
      //open: !process.env.CI,
      port: 9000,
      static: {
        directory: path.resolve(__dirname, 'static'), // Serve static files from 'static' folder
        publicPath: '/',//'/static', // Optional: access static files under /static
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
        {
          test: /\.js$/i,
          use: [
            'babel-loader',
            {
              loader: '@aurelia/webpack-loader',
              options: {
                // Avoid injected `module.hot` code that can break in eval-source-map dev bundles.
                hmr: false
              }
            }
          ],
          exclude: /node_modules/
        },
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
    externalsPresets: { node: false },
    externals: production ? undefined : [
      // Skip npm dependencies in plugin build.
      production && nodeExternals()
    ].filter(p => p),
    plugins: [
      !production && new HtmlWebpackPlugin({ template: 'index.html', favicon: 'favicon.ico' }),
      production && new webpack.DefinePlugin({
        'module.hot': 'false'
      }),
      new Dotenv({
        path: `./.env${production ? '' : '.' + (process.env.NODE_ENV || 'development')}`,
      }),
      analyze && new BundleAnalyzerPlugin()
    ].filter(p => p)
  }
}

function buildMyApp({ analyze }) {
  const cssLoader = { loader: 'css-loader' };
  const postcssLoader = {
    loader: 'postcss-loader',
    options: { postcssOptions: { plugins: ['autoprefixer'] } }
  };

  return {
    target: 'web',
    mode: 'production',
    devtool: undefined,
    entry: { 'app': './dev-app/main-myapp.js' },
    output: {
      clean: true,
      path: path.resolve(__dirname, 'dist-myapp'),
      filename: '[name].[contenthash:8].js',
      environment: {
        arrowFunction: true, const: true, destructuring: true,
        forOf: true, dynamicImport: true, optionalChaining: true, templateLiteral: true
      }
    },
    resolve: {
      extensions: ['.js'],
      modules: [path.resolve(__dirname, 'src'), path.resolve(__dirname, 'dev-app'), 'node_modules'],
      fullySpecified: false
    },
    optimization: {
      minimizer: [
        new TerserPlugin({ terserOptions: { compress: true } })
      ]
    },
    module: {
      rules: [
        { test: /\.(png|svg|jpg|jpeg|gif)$/i, type: 'asset' },
        { test: /\.(woff|woff2|ttf|eot|svg|otf)(\?v=[0-9]\.[0-9]\.[0-9])?$/i, type: 'asset' },
        {
          test: /\.css$/i,
          issuer: /[/\\]src[/\\]main\.(js|ts)$/,
          use: [cssLoader, postcssLoader]
        },
        {
          test: /\.css$/i,
          issuer: /(?<![/\\]src[/\\]main)\.(js|ts)$/,
          use: ['style-loader', cssLoader, postcssLoader]
        },
        {
          test: /\.css$/i,
          issuer: /\.html$/,
          use: [cssLoader, postcssLoader]
        },
        {
          test: /\.js$/i,
          use: ['babel-loader', { loader: '@aurelia/webpack-loader', options: { hmr: false } }],
          exclude: /node_modules/
        },
        {
          test: /[/\\](?:src|dev-app)[/\\].+\.html$/i,
          use: { loader: '@aurelia/webpack-loader', options: { defaultShadowOptions: { mode: 'open' } } },
          exclude: /node_modules/
        }
      ]
    },
    plugins: [
      new HtmlWebpackPlugin({ 
        template: 'index-myapp.html', 
        favicon: 'favicon.ico',
        scriptLoading: 'blocking'
      }),
      new Dotenv({ path: './.env.development' }),
      analyze && new BundleAnalyzerPlugin()
    ].filter(p => p)
  };
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
