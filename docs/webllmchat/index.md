---
title: Web LLM Chat
layout: home
nav_order: 2
---

# `<dbs-webllmchat>` Web Component

`dbs-webllmchat` is a web component for rendering interactive small in-browser chat application utilizing WebGPU and small LLM models in WebLLM to bring inference reasoning into web application. Small LLM models are within browser capabilities so no cloud/server/remote api is accessed and only resources from the browser computer (CPU and GPU) are utilized. For more information see [https://webllm.mlc.ai/](https://webllm.mlc.ai/)


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
<dbs-webllmchat model-class="">
</dbs-webllmchat>
```

## Attributes

| Attribute | Type   | Description                       |
|-----------|--------|-----------------------------------|
| `model-class` | string | optional model class filter to be allowed, e.g. 'Qwen', default '' |
| `temperature` | number | optional Randomness scaler T≥0 increases variability and creativity, T=0 typically means greedy decoding, default `0.5` |
| `top-p` | number | optional Nucleus sampling threshold 1≥p>0, default `0.9`|
| `system-prompt` | string | optional system prompt to set the AI agent context |

User then should 
  1. select LLM model and click Download. 
  2. After several seconds or minutes the LLM model is downloaded into browser's cache and instantiated. Progress bar shows status.
  3. Type a message and click 'Send' button.

## Future development

Currently the generic models are available. `Qwen3-*` models are recommended for their small size and still reasonable quality of responses. Custom embedding via custom attribute is planned to be done to enhance LLM capabilities with domain specific focused answers and reasoning.


