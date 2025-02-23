const propertyAllowlist: Partial<Record<keyof HTMLElementTagNameMap | "*", string[]>> = {
  "*": [
    "background",
    "border",
    "font-family",
    "font-size",
    "font-style",
    "font-weight",
    "padding",
    "text-align",
    "vertical-align",
  ],
  table: ["border-collapse"],
};

export default function makeCssInline(node: Node): Node {
  switch (node.nodeType) {
    case Node.ELEMENT_NODE:
      const element = node as Element;
      const style = window.getComputedStyle(element);

      const newElement = node.cloneNode(false) as HTMLElement;

      newElement.replaceChildren(...Array.from(node.childNodes).map((n) => makeCssInline(n)));

      newElement.removeAttribute("id");
      newElement.removeAttribute("class");

      for (const property of [
        ...(propertyAllowlist["*"] || []),
        ...(propertyAllowlist[element.localName as keyof HTMLElementTagNameMap] || []),
      ]) {
        const value = style.getPropertyValue(property);

        if (!value || value == "auto") continue;

        newElement.style.setProperty(property, property == "font-weight" && parseInt(value) >= 600 ? "700" : value);
      }

      return newElement;

    default:
      return node.cloneNode();
  }
}
