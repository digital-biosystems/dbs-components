---
title: Web LLM Chat
layout: home
nav_order: 2
---

# `<dbs-webllmchat>` Web Component

`dbs-webllmchat` is a web component for rendering interactive small in-browser chat application utilizing WebGPU and small LLM models in WebLLM to bring inference reasoning into web application.

{: .note }
version: 0.1<br/>The component is in development. Some features may not work or may change.
## Example

`<dbs-webllmchat></dbs-webllmchat>`

<dbs-webllmchat></dbs-webllmchat>

## Usage

If you use full bundle, its. included, otherwise include the component in your HTML file:

```html
<script src="path/to/dbs-webllmchat.js"></script>
```

Place the custom element
```html
<dbs-webllmchat>
</dbs-webllmchat>
```

User then should select LLM model and click Download. After several seconds or minutes the LLM model is downloaded into browser's cache and instantiated. Progress bar is visible. To send a message type it and click 'Send' button.

