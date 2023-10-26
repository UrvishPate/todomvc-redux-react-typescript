const path = require('path');
const compression = require('compression');
const express = require('express');
const http = require('http');
const chalk = require('chalk');
const isProd = process.env.NODE_ENV === 'production';
const port = process.env.PORT || 3000;
module.exports = function (options) {
  const app = express();

  if (isProd) {
    addProdMiddlewares(app, options);
  } else {
    const webpackConfig = require('../internals/webpack/webpack.dev.config');
    addDevMiddlewares(app, webpackConfig);
  }

  // serve the static assets
  app.use("/_assets", express.static(path.join(__dirname, "..", "build", "public"), {
    maxAge: "200d" // We can cache them as they include hashes
  }));
  app.use("/", express.static(path.join(__dirname, "..", "public"), {
  }));

  app.get("/*", function(req, res) {
    res.render(
      req.path,
      function(err, html) {
        if(err) {
          res.statusCode = 500;
          res.contentType = "text; charset=utf8";
          res.end(err.message);
          return;
        }
        res.contentType = "text/html; charset=utf8";
        res.end(html);
      }
    );
  });

  const server = http.createServer(app);

  server.listen(port, function () {
    console.log(chalk.green('Server started at http://localhost:' + port + '\n'));
  });
};
/**
 * Adds development middlewares to the application.
 * 
 * @param {Object} app - The application to which the middlewares are to be added.
 * @param {Object} webpackConfig - The webpack configuration to be used.
 */
function addDevMiddlewares(app, webpackConfig) {
  const webpack = require('webpack');
  const webpackDevMiddleware = require('webpack-dev-middleware');
  const webpackHotMiddleware = require('webpack-hot-middleware');
  const compiler = webpack(webpackConfig);
  const middleware = webpackDevMiddleware(compiler, {
    noInfo: true,
    publicPath: webpackConfig.output.publicPath,
    silent: true,
    stats: 'errors-only',
  });

  app.use(middleware);
  app.use(webpackHotMiddleware(compiler));

  const fs = middleware.fileSystem;

  app.get('*', (req, res) => {
    fs.readFile(path.join(compiler.outputPath, 'index.html'), (err, file) => {
      if (err) {
        res.sendStatus(404);
      } else {
        res.send(file.toString());
      }
    });
  });
}
/**
 * Adds production middlewares to the provided Express application.
 * 
 * @param {Object} app - The Express application.
 * @param {Object} options - An object containing options for configuring the middlewares.
 * @param {string} options.publicPath - The public path to serve static files from. Defaults to '/'.
 * @param {string} options.outputPath - The path to the directory where the static files are located. Defaults to the 'build' directory in the current working directory.
 */
function addProdMiddlewares(app, options) {
  const publicPath = options.publicPath || '/';
  const outputPath = options.outputPath || path.resolve(process.cwd(), 'build');

  app.use(compression());
  app.use(publicPath, express.static(outputPath));

  app.get('*', (req, res) => res.sendFile(path.resolve(outputPath, 'index.html')));
}