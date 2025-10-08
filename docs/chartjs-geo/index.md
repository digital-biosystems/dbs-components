---
title: ChartJS GEO
layout: home
nav_order: 2
---

# `<dbs-chartjs-geo>` Web Component

`<dbs-chartjs-geo>` is a web component that integrates Chart.js with geographical data visualization. It enables rendering interactive maps and geo-based charts in web applications.

{: .note }
version: 0.1<br/>The component is in development. Some features may not work or may change.

## Example

`<dbs-chartjs-geo></dbs-chartjs-geo>`

<dbs-chartjs-geo></dbs-chartjs-geo>

## Features

- Supports GeoJSON data
- Renders maps with Chart.js
- Customizable styles and tooltips
- Responsive and interactive

## Usage

Include the component in your HTML file:

```html
<script src="path/to/chartjs-geo.js"></script>
```
Place the web component whenever a geochart is needed to be rendered
```html
<dbs-chartjs-geo
    geojson="path/to/data.geojson"
    type="choropleth"
    width="600"
    height="400">
</dbs-chartjs-geo>
```

## Attributes

| Attribute   | Description                  | Example                |
|-------------|-----------------------------|------------------------|
| `geojson`   | URL or object of GeoJSON    | `data.geojson`         |
| `type`      | Chart type (`choropleth`, `bubble`) | `choropleth`          |
| `width`     | Canvas width                | `600`                  |
| `height`    | Canvas height               | `400`                  |

## Events

- `chart-ready`: Fired when the chart is initialized.
- `feature-click`: Fired when a map feature is clicked.

## Example

```html
<dbs-chartjs-geo
    geojson="countries.geojson"
    type="choropleth"
    width="800"
    height="500">
</dbs-chartjs-geo>
```

## Resources

- [Chart.js Documentation](https://www.chartjs.org/docs/)
- [GeoJSON Specification](https://geojson.org/)
- [chartjs-geo GitHub](https://github.com/chartjs/chartjs-geo)
