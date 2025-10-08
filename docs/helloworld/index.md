---
title: Hello world
layout: home
nav_order: 2
---

# `<dbs-hello-world>` Web Component

The `<dbs-hello-world>` web component displays a simple greeting message. It can be used to quickly add a customizable "Hello, World!" message to your web application.

{: .note }
version: 0.1<br/>The component is in development. Some features may not work or may change.

## Demo
`<dbs-hello-world message='from just-the-docs MD'></dbs-hello-world>`

<dbs-hello-world message='from just-the-docs MD'></dbs-hello-world>

## Features

- Customizable greeting text
- Lightweight and easy to use
- Compatible with all modern browsers

## Usage

Include the component in your HTML file:

```html
<script src="path/to/hello-world.js"></script>
```

Place the custom element

```html
<dbs-hello-world message="Welcome to DBS Components!"></dbs-hello-world>
```

## Attributes

| Attribute | Description                | Type   | Default         |
|-----------|----------------------------|--------|-----------------|
| `message` | The greeting to display    | String | "Hello, World!" |

## Methods

No public methods are exposed.

## Events

No custom events are emitted.

## Styling

You can style the component using standard CSS:

```css
hello-world {
    color: #0078d4;
    font-size: 1.2em;
}
```
