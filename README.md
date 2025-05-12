# affine-reader

This is a simple reader for the blocksuite YJS doc format.
The main goal right now is to convert a random YJS doc into a markdown file.

## Install

`pnpm install affine-reader`

## Usage

The following will create a reader for a workspace and then get all the pages in that workspace.
Page markdown is available in `.md` property.

```js
const { getBlocksuiteReader } = require("affine-reader");

const reader = await getBlocksuiteReader({ workspaceId: "workspace-id" });
const pages = await reader.getWorkspacePages(true);
```

For a real world use case, see the [demo here](https://affine-reader.vercel.app/) and the code in [playground](./playground) directory, which integrates `affine-reader` with Next.js.

## Export a affine to markdown locally

```
Usage: affine-exporter -w [workspace_id] -t [token]

Options:
      --help          Show help                                        [boolean]
      --version       Show version number                              [boolean]
  -t, --token         refresh token                                     [string]
  -w, --workspace_id  workspace id                                      [string]
```
