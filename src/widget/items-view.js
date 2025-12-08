import {LiveValue} from '../events.js'
import {LiveObject} from '../model.js'
import {Widget} from '../widget.js'

export default class ItemsView extends Widget{
	ContainerElement = 'div'
	#onItemsContentChanged
	#template
	#context

	constructor(props, dontBind){
		super(
			[ ['items', null, ItemsView.prototype.onItemsChanged]
			, ...(props||[])
			],
			true)

		this.template = this.querySelector('template') 
			|| this.shadowRoot.querySelector('template#default')
		this.container = this.shadowRoot.querySelector(this.ContainerElement)

		this.#onItemsContentChanged = this.onItemsContentChanged.bind(this)

		if(!dontBind)
			this.bind()
	}

	createItemElement(index, item){
		let context = LiveObject.create(
			{ item
			, index
			, parent: this.parent
			})
		let element = this.template.content.cloneNode(true)

		for(let elm of element.children)
			this.binder.bindItem(context, elm)

		return element
	}

	updateItems(){
		let idx = 0

		if(this.items)
			for(; idx < this.items.length; ++idx){
				if(idx < this.container.childElementCount){
					let element = this.container.children[idx]

					element.item = this.items[idx]
				}
				else{
					this.container.append(this.createItemElement(idx, this.items[idx]))
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

		if(this.items.addEventListener)
			this.items.addEventListener('setvalue', this.#onItemsContentChanged)
	}

	onItemsContentChanged(){
		this.updateItems()
	}
}

