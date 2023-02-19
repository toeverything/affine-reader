export const encodeLink = (link: string) =>
  encodeURI(link)
    .replace(/\(/i, "%28")
    .replace(/\)/i, "%29")
    .replace(/(\?|&)response-content-disposition=attachment.*$/, "")
