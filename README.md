# dbs-components

This project is bootstrapped by [aurelia/new](https://github.com/aurelia/new).

## Start dev web server

    npm start

Note this plugin project comes with a dev-app. The above command starts the dev app in `dev-app/` folder. The plugin source code is in `src/` folder.

## Build the plugin in production modern

    npm run build

It builds plugin into `dist/index.js` file.

Note when you do `npm publish` or `npm pack` to prepare the plugin package, it automatically run the above build command by the `prepare` script defined in your package.json `"scripts"` section.

## Use web components

See `test/index.html` file.
In general, add shared script and component script
```
<head> 
<script src="shared.js"></script>
<script src="pgxchart.js"></script>
...
</head>
```

Use the web component at the right place 
```
<body>
...
    <dbs-pgxchart></dbs-pgxchart>
...
</body>
```

Integrate web components into another app. <a href="https://docs.aurelia.io/developer-guides/web-components#usage-outside-aurelia-applications">https://docs.aurelia.io/developer-guides/web-components#usage-outside-aurelia-applications</a>
Consult web component sources or docs howto use it.


## Unit Tests

    npm run test

Run unit tests in watch mode.

    npm run test:watch


## Analyze webpack bundle

    npm run analyze
