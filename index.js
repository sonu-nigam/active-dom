/**
    * @typedef {Partial<HTMLElement | HTMLAnchorElement | HTMLBRElement | HTMLImageElement>} HtmlProps
    * @property {string} [*]
    */

class Root {
    /**
    * @param {HTMLElement | DocumentFragment} ctx 
    */
    constructor(ctx) {
        this.root = ctx
        this.parentElement = ctx
        this.previousChild = null
        this.queue = []
        this.pauseExecution = false
    }

    /**
    * @typedef {Object} Task 
    * @property {*} Task.fn
    * @property {Array.<*>} task.args
    */
    
    /** @param {Task} task */
    addTask(task) {
        this.queue.push(task); 
        this.executeQueue();
    }

    /** @param {Task} task */
    async executeTask(task) {
        return this[task.fn].apply(this, task.args)
    }

    async executeQueue() {
        if (this.pauseExecution) return;
        this.pauseExecution = true;
        while (this.queue.length) {
            const task = this.queue[0];
            this.pauseExecution = true;
            await this.executeTask(task);
            this.queue.shift();
        }
        this.pauseExecution = false;
    }

    /**
    * @param {keyof HTMLElementTagNameMap | string } element 
    * @returns {boolean}
    */
    isVoidElement(element) {
        return ["AREA", "BASE", "BR", "COL", "HR", "IMG", "INPUT",
            "LINK", "META", "PARAM", "SOURCE", "TRACK", "WBR"].includes(element)
    }

    getCurrentElement() {
        if (this.previousChild) return this.previousChild.nextSibling
        return this.parentElement.firstChild
    }

    /**
    * @param {string} str 
    */
    async _text(str) {
        let currentElement = this.getCurrentElement()
        const nodeValue = currentElement?.nodeValue || null
        if (nodeValue !== str) {
            const textNode = document.createTextNode(String(str));
            if (!nodeValue) {
                this.parentElement.appendChild(textNode);
            } else {
                this.parentElement.replaceChild(textNode, currentElement)
            }
            currentElement = textNode
        }
        this.previousChild = currentElement
        return this
    }

    /**
     * @param {keyof HTMLElementTagNameMap | typeof HTMLElement | typeof DocumentFragment} element 
     * @returns {string | keyof HTMLElementTagNameMap}
     */
    _getNodeName(element) {
        if (typeof element === "string") {
            return element.toUpperCase()
        }

        if (element.prototype instanceof HTMLElement) {
            const elementName = element.name;
            const dashed = elementName
                .replace(/([A-Z]($|[a-z]))/g, '-$1')
                .replace(/--/g, "-")
                .replace(/^-|-$/, "")
                .toLowerCase();
            if (!dashed.includes("-")) {
                throw new DOMException(
                    `${String(elementName)} is not a valid tag name`,
                    'SyntaxError'
                );
            }
            return dashed.toUpperCase();
        }

        if (element instanceof DocumentFragment) {
           return element.nodeName.toUpperCase() 
        }
        throw new DOMException(
            `${String(element)} is not a valid tag name`,
            'SyntaxError'
        );
    }

    /**
    * @param {keyof HTMLElementTagNameMap | typeof HTMLElement} element 
    * @param {HtmlProps} [props] 
    */
    async _node(element, props = {}) {
        const nodeName = this._getNodeName(element)
        const isVoidElement = this.isVoidElement(nodeName)
        let currentElement = this.getCurrentElement()
        if (currentElement?.nodeName !== nodeName) {
            if (typeof element !== "string"
                && element.prototype instanceof HTMLElement
                && !customElements.get(nodeName?.toLowerCase())
            ) {
                customElements.define(nodeName?.toLowerCase(), element);
            }

            const newNode = document.createElement(nodeName);
            if (!currentElement) {
                this.parentElement.appendChild(newNode);
            } else {
                this.parentElement.replaceChild(newNode, currentElement)
            }
            currentElement = newNode
        }

        const cacheProps = currentElement.$cacheProps || []
        const newProps = Object.keys(props)
        const allProps = new Set([...cacheProps, ...newProps])
        for (const prop of allProps) {
            if (props[prop] === currentElement[prop]) continue;
            if (prop.startsWith("$")
                || prop === "className"
                || prop.startsWith("on")
            ) {
                currentElement[prop] = props[prop];
            } else if (prop === "style") {
                Object.assign(currentElement[prop], props[prop])
            } else {
                currentElement.setAttribute(prop, props[prop])
            }
        }

        if (newProps.length) currentElement.$cacheProps = newProps

        if (isVoidElement) {
            this.previousChild = currentElement;
        } else {
            this.parentElement = currentElement;
            this.previousChild = null
        }
        return this
    }

    /**
    * @param {keyof HTMLElementTagNameMap | typeof HTMLElement} [ element ] 
    */
    async _end(element) {
        if (element
            && String(element).toUpperCase() !== this.parentElement.nodeName){
            throw new Error(
                "Wrong End tag is provided. Expected: " +
                element + " Provided: " + this.parentElement.nodeName +
                " in component " + this.root.nodeName
            )
        }

        while (this.previousChild?.nextSibling) {
            this.previousChild.nextSibling?.remove()
        }

        this.previousChild = this.parentElement;
        this.parentElement = this.parentElement.parentElement;
        return this
    }

    async _finish () {
        const currentElement = this.getCurrentElement();

        while(currentElement && currentElement !== this.root) {
            this.addTask({fn: "_end", args: []})
        }
        return null
    }
}

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


