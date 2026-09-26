---
title: DBS Web components
layout: home
nav_order: 1
---

# DBS Web Components - Introduction


This site includes reusable web components to visualise scientific data. The web components are static, don't need server. You can host the web components in your web application. All web components define custom element with prefix `dbs-`.

{: .note }
version: 0.1<br/>Note that the components are in heavy development stage thus some of the feature may not work or may change, while the static URL should remain

## Usage

The web components are framework agnostic. They introduce standard custom elements that enhance HTML vocabulary.

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

### Download JS  bundle 

From https://github.com/digital-biosystems/dbs-components/tree/release/dist

### Use single bundle with basic DBS components (1MB)

1. download release of web components https://github.com/digital-biosystems/dbs-components/releases and find `/dist/dbs-bundle.js` and copy to your web app location.
2. include the script that defines behavior of the web component's custom element: 
```html
<script src="dbs-bundle.js"></script>
```   
3. use the web components custom element in the HTML body in Markdown e.g.: `<dbs-hello-world message='from just-the-docs MD'></dbs-hello-world>`

### Use single bundle with all DBS components (includes webllm,geochart,kbsearch) (8MB)

1. download release of web components https://github.com/digital-biosystems/dbs-components/releases and find `/dist/dbs-full-bundle.js` and copy to your web app location.
2. include the script that defines behavior of the web component's custom element: 
```html
<script src="dbs-full-bundle.js"></script>
```   
3. use the web components custom element in the HTML body in Markdown e.g.: `<dbs-hello-world message='from just-the-docs MD'></dbs-hello-world>`

### Use multiple bundles with selected components
1. download release of web components https://github.com/digital-biosystems/dbs-components/releases and find `/dist/dbs-shared.js` and `/dist/dbs-[some-component].js` and copy to your web app location.
2. include the script that defines behavior of the web component's custom element: 
```html
<script src="dbs-shared.js"></script>
<script src="dbs-[some-component].js"></script>
```
3. use the web components custom element in the HTML body in Markdown e.g.: `<dbs-hello-world message='from just-the-docs MD'></dbs-hello-world>`

## Live examples
 See component documentation on live examples.