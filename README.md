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

Choose prefered method, either using cached JS from CDN or local copy of single JS or multiple JS bundles.

### CDN
Include the script bundle in head of your HTML and use web-component's custom element anywhare in your web app.
```html
<head>
    ...
<script src="https://cdn.jsdelivr.net/gh/digital-biosystems/dbs-components@release/dist/dbs-bundle.js "></script>
</head>
<body>
    ...
    <dbs-hello-world message='DBS web components'></dbs-hello-world>
    ...
</body>    
```

### single bundle with all components

1. download release of web components https://github.com/digital-biosystems/dbs-components/releases and find `/dist/dbs-bundle.js` and copy to your web app location.
2. include the script that defines behavior of the web component's custom element: 
```html
<script src="dbs-bundle.js"></script>
```   
3. use the web components custom element in the HTML body in Markdown e.g.: `<dbs-hello-world message='from just-the-docs MD'></dbs-hello-world>`

### multiple bundles with selected components
1. download release of web components https://github.com/digital-biosystems/dbs-components/releases and find `/dist/dbs-shared.js` and `/dist/dbs-[some-component].js` and copy to your web app location.
2. include the script that defines behavior of the web component's custom element: 
```html
<script src="dbs-shared.js"></script>
<script src="dbs-[some-component].js"></script>
```
3. use the web components custom element in the HTML body in Markdown e.g.: `<dbs-hello-world message='from just-the-docs MD'></dbs-hello-world>`
Integrate web components into another app. <a href="https://docs.aurelia.io/developer-guides/web-components#usage-outside-aurelia-applications">https://docs.aurelia.io/developer-guides/web-components#usage-outside-aurelia-applications</a>
Consult web component sources or docs howto use it.


## Unit Tests

    npm run test

Run unit tests in watch mode.

    npm run test:watch


## Analyze webpack bundle

    npm run analyze
