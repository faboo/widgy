import {LiveValue} from '../events.js'
import {LiveObject} from '../model.js'
import {Widget, loadWidgets} from '../base.js'

export default class ItemsView extends Widget{
	#onItemsContentChanged
	#template
	#context

	constructor(props){
		super(
			[ ['items', null]
			, ...(props||[])
			])

		this.template = this.querySelector('template') 
			|| this.shadowRoot.querySelector('template#default')
		this.container = null

		loadWidgets(this.template.content)

		this.#onItemsContentChanged = this.onItemsContentChanged.bind(this)
	}

	get containerTagName(){
		return 'div'
	}

	connectedCallback(){
		super.connectedCallback()
		this.container = this.shadowRoot.querySelector(this.containerTagName)
		this.itemsProperty.addListener(this.onItemsChanged.bind(this))
	}

	createItemElement(index, item){
		let context = LiveObject.create(
			{ item
			, index: index+1
			, parent: this.parent
			})
		let element = this.template.content.cloneNode(true)


		for(let elm of element.children){
			elm.dataContext = context
			elm.setAttribute('part', 'item')
		}

		return element
	}

	bindItem(element){
		for(let elm of element.children)
			this.binder.bindItem(context, elm)
	}

	updateItems(){
		let idx = 0

		if(this.items)
			for(; idx < this.items.length; ++idx){
				if(idx < this.container.childElementCount){
					let element = this.container.children[idx]

					element.dataContext.item = this.items.at(idx)
				}
				else{
					let element = this.createItemElement(idx, this.items.at(idx))
					//TODO: Appending causes the custom element to connect, causing re-binding
					// The binder needs to understand that the context object is the the "parent" of this element
					this.container.append(element)
					this.bindItem(element)
				}
			}

		while(idx < this.container.childElementCount)
			this.container.children[idx].remove()
			//TODO: destory bindings
	}

	onItemsChanged(event){
		if(event.oldValue && event.oldValue.removeEventListener)
			event.oldValue.removeEventListener('setvalue', this.#onItemsContentChanged)

		this.container.innerHTML = ''
		this.updateItems()

		if(this.items && this.items.addEventListener)
			this.items.addEventListener('setvalue', this.#onItemsContentChanged)
	}

	onItemsContentChanged(){
		this.updateItems()
	}
}

