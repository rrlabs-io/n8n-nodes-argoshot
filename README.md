# n8n-nodes-argoshot

An [n8n](https://n8n.io) community node for [Argoshot](https://argoshot.com): screenshots, PDFs and Open Graph images
of any public web page or HTML, from a workflow or an AI agent (the node is usable as a tool).

## Install

In a self-hosted n8n: **Settings → Community nodes → Install**, then `n8n-nodes-argoshot`.

## Credential

**Argoshot API**: the access key from the API keys page of your Argoshot dashboard (https://argoshot.com/app/keys).
A key set to "signed requests only" cannot be used here.

## Operations

- **Screenshot**: a URL or HTML to PNG, JPEG, WebP or PDF. Options: device, viewport, full page, dark mode, block ads,
  hide cookie banners, selector, delay, image quality, how long to keep the result, and any other API option as JSON.
  The file is downloaded into a binary field (on by default); the JSON has the result URL, page title, size, HTTP status
  and the credits used (0 when answered from the cache).
- **Usage**: the account's renders used and left.

API reference: https://argoshot.com/docs

## Develop

```sh
npm install --ignore-scripts
npm run lint
npm run build
npm run dev     # a local n8n with the node loaded
```

Releases are published from GitHub Actions with provenance when a `v*` tag is pushed.

MIT licence.
