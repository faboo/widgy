import {Binder, addProperty} from './base.js'
import {isListenable, BindingExpression, LiveTextValue, LiveText} from './events.js'


export class Widget extends HTMLElement{
	static #domParser = new DOMParser()
	static custom = true

	#bound
	#bindings

	constructor(props){
		super()

		this.#bound = false
		this.#bindings = []
		this.parent = this.findParent()
		this.binder = new Binder(this)

		this.#addProperties(props)
		this.#createShadow()
		this.binder.bind()

		this.#bound = true

		/*
		this.#booleanAttributes = {}
		this.addProperty('shown', null, this.onShownChanged)

		/* Drag and Drop */
		/*
		this.addProperty('dragdata')
		this.addProperty('dragdatatype')
		//this.addProperty('dropTarget', false, null, Boolean)
		this.addProperty('dropdatatype')
		this.addProperty('dropcontainer', false, null, Boolean)
		this.addProperty('dropover', false)

		this.addAttribute('id')
		this.addAttribute('hidden')
		this.addAttribute('class', 'className', '')
		*/
	}

	findParent() {
		let parentNode = this.parentNode
		
		while(!parentNode.host && parentNode.parentNode){
			parentNode = parentNode.parentNode
		}

		return parentNode.host || window.application
	}

	#createShadow(){
		const template = document.getElementById('widgy-template-'+this.localName)

		if(template){
			this.attachShadow({ mode: "open" });
			this.shadowRoot.appendChild(template.content.cloneNode(true));
		}
	}

	#addProperties(props){
		for(let prop of props){
			let name = prop[0]

			if(name !== name.toLowerCase())
				console.warn(`Widget properties should be all lowercase - ${this.constructor.name}.${name} is not`)

			addProperty.apply(null, [this, ...prop])
		}
	}

	attributeChangedCallback(){
		console.log(arguments)
	}

	onShownChanged(){
		if(this.shown !== null)
			this.hidden = !this.shown
	}

	onDrop(event, data, type){
	}

	rawDrop(event){
		let type = this.application.getDragDataType()
		let data = this.application.takeDragData()

		event.preventDefault()

		this.onDrop(event, data, type)
	}

	rawDragover(event){
		if(!this.dropdatatype || window.application.getDragDataType() == this.dropdatatype){
			//event.dataTransfer.dropEffect = 'move'
			event.preventDefault()
		}
		else{
			//event.dataTransfer.dropEffect = 'none'
		}
	}

	rawDragenter(event){
		this.dropover = true
	}

	rawDragleave(event){
		this.dropover = false
	}

	addBooleanAttribute(name, selector, initialValue){
		/*
		this.addProperty(name, initialValue, this.booleanAttributeChanged)
		this.#booleanAttributes[name] = selector
		*/
	}

	isVisible(){
		let hasSize = this.root.offsetWidth || this.root.offsetHeight || this.root.getClientRects().length

    	return !!hasSize
	}
}
