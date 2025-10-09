---
title: PGx Chart
layout: home
nav_order: 2
---

# `<dbs-pgxchart>` Web Component

`dbs-pgxchart` is a customizable web component for rendering interactive pharmacogenomic charts in web applications.

{: .note }
version: 0.1<br/>The component is in development. Some features may not work or may change.
## Example

`<dbs-pgxchart></dbs-pgxchart>`

<dbs-pgxchart></dbs-pgxchart>

## Features

- Responsive design
- Customizable colors and labels
- Data binding via attributes or properties

## Usage


Include the component in your HTML file:

```html
<script src="path/to/dbs-pgxchart.js"></script>
```

Place the custom element
```html
<dbs-pgxchart
    toxicLevel="0.012"
    therapLevel="0.005">
</dbs-pgxchart>
```

## Attributes

| Attribute | Type   | Description                       |
|-----------|--------|-----------------------------------|
| `toxicLevel` | string | toxic level `0.012` |
| `therapLevel`| string | therapeutic level `0.005` |

## Events

- `chart-click`: Fired when a chart element is clicked.

## Methods

- `updateData(data)`: Updates chart data dynamically.


