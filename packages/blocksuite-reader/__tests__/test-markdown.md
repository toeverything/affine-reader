![rGYX3snAottbkj8N--e1h4L-fjLgR0AanCeSRM12MdU=](https://app.affine.pro/api/workspace/test/blob/rGYX3snAottbkj8N--e1h4L-fjLgR0AanCeSRM12MdU=)

A month ago [my blog was migrated to Notion](https://pengx17.vercel.app/posts/mdx-to-notion) and using Notion as a CMS.

Now that I am more involved in AFFiNE and it is just released [Downhills](https://twitter.com/AffineOfficial/status/1626507416019009536) version. One of the most notable features is that it allows you to publish your workspace and share it with others.

I have seen people in the community already sharing their implementations so far:

* [sharing the public workspace directly](https://app.affine.pro/public-workspace/MTjEmB7Chv-qxl_Yx-Syt/1f93d7efbc654dee9b0fae108d555554)
* [affine-ghost](https://github.com/tzhangchi/AFFiNE-ghost): using Playwright to serve the workspace and export pages as MD
I also come up with my own solution that is purely built on Next 13 app layout + React server components. You can check the repo [here](https://github.com/pengx17/next-blog-affine)  and the public workspace [here](https://app.affine.pro/public-workspace/MTjEmB7Chv-qxl_Yx-Syt).


---

### A Brief Tech Intro

My solution is similar to my previous solution on Notion. The goal is:

* get the list of pages with meta (page names, dates)
* convert the page contents from hosting spec to markdown on the server
* render markdown as mdx and empower the content with React components
In the current implementation of AFFiNE, pages are arrays of blocks that are managed in workspaces, which is a wrapper around [YJS](https://github.com/yjs/yjs) doc.

Even though per our goal we do not need collaborations as we only need a snapshot of the latest content, we cannot do this directly since the official library does not provide a solution that works in the server yet.

So I made one on my own:

* grab the public `yDoc`, iteratively get the blocks of each page
* for each block, convert to MD based on its flavor (it may be also nested)
* on the leaf `yText`` node, we get the ``delta`` and `convert to MD using  quill-delta-to-markdown
You can see the main implementation is a big if/else function:

```typescript
function block2md(yBlock: YBlock, yBlocks: YBlocks, padLeft = ""): string {
  const flavour = yBlock.get("sys:flavour") as Flavour;
  const type = yBlock.get("prop:type") as string;
  const toMd = () => deltaToMd((yBlock.get("prop:text") as Y.Text).toDelta());
  let content = "";
  let resetPadding = false;

  switch (flavour) {
    case "affine:paragraph": {
      let initial = "";
      if (type === "h1") {
        initial = "# ";
      } else if (type === "h2") {
        initial = "## ";
      } else if (type === "h3") {
        initial = "### ";
      } else if (type === "h4") {
        initial = "#### ";
      } else if (type === "h5") {
        initial = "##### ";
      } else if (type === "h6") {
        initial = "###### ";
      } else if (type === "quote") {
        initial = "> ";
      }
      content = initial + toMd() + "\n";
      break;
    }
    case "affine:divider": {
      content = "\n---\n\n";
      break;
    }
    case "affine:list": {
      content = "* " + toMd();
      break;
    }
    case "affine:code": {
      const lang = (yBlock.get("prop:language") as string).toLowerCase();
      content = "```" + lang + "\n" + toMd() + "```\n\n";
      break;
    }
    case "affine:embed": {
      if (type === "image") {
        // https://app.affine.pro/api/workspace/mWn__KSlOgS1tdDEjdX6P/blob/hG9UPLuPwAO_Ahot5ztXkr53NVIRKaMb_7NcPaiK5MQ=
        const sourceId = yBlock.get("prop:sourceId") as string;
        content = `![${sourceId}](${target}/api/workspace/${workspaceId}/blob/${sourceId})\n\n`;
        break;
      }
    }
    case "affine:page":
    case "affine:frame": {
      content = "";
      resetPadding = true;
      break;
    }
    default:
      throw new Error(flavour + " rendering not implemented");
  }

  const childrenIds = yBlock.get("sys:children");
  if (childrenIds instanceof Y.Array) {
    content += childrenIds
      .map((cid) => {
        return block2md(
          yBlocks.get(cid) as YBlock,
          yBlocks,
          resetPadding ? "" : padLeft + "  "
        );
      })
      .join("");
  }
  return padLeft + content;
}
```

## `<Fin />`

