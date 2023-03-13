# affine-reader

This is a simple reader for the blocksuite YJS doc format.
The main goal right now is to convert a random YJS doc into a markdown file.

## Install

`pnpm install affine-reader`

## Usage

The following will create a reader for a workspace and then get all the pages in that workspace.
Page markdown is available in `.md` property.

```js
const { getBlocksuiteReader } = require('affine-reader');

const reader = await getBlocksuiteReader({ workspaceId: 'workspace-id' })
const pages = await reader.getWorkspacePages(true);

```
