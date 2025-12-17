---
title: Knowledge Base Search
layout: home
nav_order: 2
---

# `<dbs-kbsearch>` Web Component

`dbs-kbsearch` is a customizable web component for searching in knowledge base. Knowledge base is embedded within the component from deliverable D2.2 of oncoscreen project [https://oncoscreen.health/](https://oncoscreen.health/). Future version may add customized knowledge via attribute.

{: .note }
version: 0.1<br/>The component is in development. Some features may not work or may change.
## Example

`<dbs-kbsearch showinput="true"></dbs-kbsearch>`

<dbs-kbsearch showinput="true"></dbs-kbsearch>

## Features


## Usage


Include the component JS in your HTML file, e.g. head section:

```html
<head>
  <script src="path/to/dbs-shared.js"></script>  
  <script src="path/to/dbs-kbsearch.js"></script>
  ...
</head>  
```

Place the custom element with optional input query bar that can be used to place input

```html
<dbs-kbsearch showinput="true">
</dbs-kbsearch>
```

The event bus to publish query and subscribe for results is exposed as global `window.DbsKbsearch`.

The query string can be submitted to 'kbsearch:query' channel by calling `window.DbsKbsearch.publish('kbsearch:query', somequerystring);` 

e.g.
```js
            // Publish query to KBSearch component
            window.DbsKbsearch.publish('kbsearch:query', 'lapatinib');

```

Results are returned via 'kbsearch:result' channel. It can be listened e.g. by registering listener method:
```js
            // Subscribe to KBSearch result events
            window.DbsKbsearch.subscribe('kbsearch:result', (data) => {
                console.log('Got KBSearch response:', data);
            });
```

## Attributes

`showinput` default `"false"`. If 'true' Renders input bar in component view, and simple list of results, user can type query. If 'false', component is invisible and visualisation and sending query is upon other components via the custom events.

`src` default `""`. Gets knowledge base JSON from the URL.

## Events

* `kbsearch:query` 
* `kbsearch:result`



