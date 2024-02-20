import Renderer from "active-dom";

const render = (ctx) => new Renderer(ctx)
    .node("div")
        .node("div")
            .node("span")
                .text("Hello")
            .end("span")
        .end("span")
    .end("div")

class RootElement extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        render(this)
    }
}

customElements.define("root-element", RootElement)
