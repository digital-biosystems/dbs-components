---
title: PGx Chart
layout: home
nav_order: 2
---

# `<dbs-pgx-chart>` Web Component

`dbs-pgx-chart` is a customizable web component for rendering interactive pharmacogenomic charts in web applications.

{: .note }
version: 0.1<br/>The component is in development. Some features may not work or may change.
## Features

- Responsive design
- Customizable colors and labels
- Data binding via attributes or properties

## Usage


Include the component in your HTML file:

```html
<script type="module" src="path/to/dbs-pgxchart.js"></script>
```

Place the custom element
```html
<dbs-pgx-chart
    type="line"
    data='[{"x":1,"y":10},{"x":2,"y":20}]'
    labels='["Jan", "Feb"]'
    color="#3498db">
</dbs-pgx-chart>
```

## Attributes

| Attribute | Type   | Description                       |
|-----------|--------|-----------------------------------|
| `type`    | string | Chart type (`line`, `bar`, `pie`) |
| `data`    | array  | Chart data in JSON format         |
| `labels`  | array  | Labels for data points            |
| `color`   | string | Primary color for chart           |

## Events

- `chart-click`: Fired when a chart element is clicked.

## Methods

- `updateData(data)`: Updates chart data dynamically.

## Example

```html
<dbs-pgx-chart
    type="bar"
    data='[{"x":"A","y":5},{"x":"B","y":15}]'
    labels='["A", "B"]'
    color="#e74c3c">
</dbs-pgx-chart>
```

## Styling

Customize with CSS:

```css
dbs-pgx-chart {
    width: 100%;
    height: 400px;
}
```
