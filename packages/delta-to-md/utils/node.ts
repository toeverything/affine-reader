// @ts-nocheck
let id = 0

export class Node {
  id = ++id
  children: Node[];
  open: string;
  close: string;
  text: string;

  _parent: Node;

  constructor(data?: string[] | string) {
    if (Array.isArray(data)) {
      this.open = data[0]
      this.close = data[1]
    } else if (typeof data === 'string') {
      this.text = data
    }
    this.children = []
  }

  append(e: Node) {
    if (!(e instanceof Node)) {
      e = new Node(e)
    }
    if (e._parent) {
      const idx = e._parent.children.indexOf(e);
      e._parent.children.splice(idx, 1);
    }
    e._parent = this
    this.children = this.children.concat(e)
  }

  render() {
    let text = ''
    if (this.open) {
      text += this.open
    }
    if (this.text) {
      text += this.text
    }
    for (let i = 0; i < this.children.length; i++) {
      text += this.children[i].render()
    }
    if (this.close) {
      text += this.close
    }
    return text
  }

  parent() {
    return this._parent
  }
}

