/**
 * @template T
 * @typedef {keyof HTMLElementTagNameMap | ( new () => T )} Element
 */

/**
    * @typedef {Partial<HTMLElement | HTMLAnchorElement | HTMLBRElement | HTMLImageElement>} HtmlProps
    * @property {string} [*]
    */

import { Root } from "./core/root.js";

export default class Renderer {
    /**
    * @param {HTMLElement | DocumentFragment} ctx 
    */
    constructor (ctx) {
        this.tree = new Root(ctx)
    }

    /**
    * @param {string | number} nodeValue 
    * @returns {this}
    */
    text(nodeValue) {
        this.tree.addTask({fn: this.tree._text.name, args: [String(nodeValue)]});
        return this 
    }

    /**
    * @param {keyof HTMLElementTagNameMap | typeof HTMLElement} element 
    * @param {HtmlProps} [props] 
    * @returns {this}
    */
    node(element, props) {
        this.tree.addTask({fn: this.tree._node.name, args: [element, props]});
        return this 
    }

    /**
    * @param {keyof HTMLElementTagNameMap | typeof HTMLElement} [element] 
    * @returns {this}
    */
    end(element) {
        this.tree.addTask({fn: this.tree._end.name, args: [element]});
        return this 
    }

    finish () {
        this.tree.addTask({fn: this.tree._finish.name, args: []})
        return null
    }

    /**
     * @callback bindCallback
     * @param {this} currentCtx
     * @param {typeof this.tree.root} [root]
     */

    /**
     * @param {bindCallback} callback 
     * @returns {this}
     */
    bind(callback) {
        callback(this, this.tree.root)
        return this 
    }

    /**
        * @param {Renderer} ctx
        * @returns {Object}
        * @prop {node} node
        * @prop {text} text
        * @prop {end} end
        * @bind {bind} bind
        */
    static MethodBinder = (ctx) => {
        const funcNames = ["node", "text", "end", "bind"]
        const obj = {}
        funcNames.forEach(name => {
            obj[name] =ctx[name].bind(ctx)
        })
    }
}

