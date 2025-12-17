---
title: PGx Chart 2
layout: home
nav_order: 3
---

# `<dbs-pgxchartd>` Web Component

`dbs-pgxchartd` is a customizable web component for rendering interactive pharmacogenomic charts in web applications. Compared to `dbs-pgxchart` it was exported using different toolchain allowing better simulation steps and shorter re-simulation time.

{: .note }
version: 0.1<br/>The component is in development. Some features may not work or may change.
## Example

`<dbs-pgxchartd></dbs-pgxchartd>`

<dbs-pgxchartd></dbs-pgxchartd>

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
<dbs-pgxchartd
    toxicLevel="0.012"
    therapLevel="0.005">
</dbs-pgxchartd>
```

## Attributes

| Attribute | Type   | Description                       |
|-----------|--------|-----------------------------------|
| `toxicLevel` | string | toxic level `0.012` |
| `therapLevel`| string | therapeutic level `0.005` |

