# dbs-components

This project is bootstrapped by [aurelia/new](https://github.com/aurelia/new).

## Start dev web server

    npm start

Note this web components project comes with a dev-app. The above command starts the dev app in `dev-app/` folder. The web components source code is in `src/` folder.

## Build the production

    npm run build

It builds web components into `dist/` directory.

Note when you do `npm publish` or `npm pack` to prepare the web components package, it automatically run the above build command by the `prepare` script defined in your package.json `"scripts"` section.

## Source codes
In `/src`

## Documentation
In `/docs`. Currently - merge changes in `/docs` and `/dist` to `release` branch and push them to external `github` repository at `github.com:digital-biosystems/dbs-components`. Automatic build of just-the-docs template is triggered and public documentation is rendered at https://digital-biosystems.github.io/dbs-components/

## Use web components

See `test/index.html` file.
In general, add shared script and component script
```
<head> 
<script src="dbs-shared.js"></script>
<script src="dbs-pgxchart.js"></script>
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
