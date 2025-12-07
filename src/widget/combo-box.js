import Widget from '../widget.js'
import {LiveObject} from '../model.js'

export default class ComboBox extends Widget{
	ContainerElement = 'select'
	#select

	constructor(){
		super(
			[ ['name', '']
			, ['autocomplete']
			, ['selected', '', ComboBox.prototype.onItemSelected]
			, ['items', null, ComboBox.prototype.onItemsChanged]
			, ['editable', false, ComboBox.prototype.onEditableChanged, Boolean]
			, ['hideinput', true]
			],
			true)
		this.template = this.shadowRoot.querySelector('template#default')
		this.container = this.shadowRoot.querySelector(this.ContainerElement)

		if(this.items){
			if(this.querySelector('optgroup, option'))
				logging.warn('Setting items and options on a select is not supported')

			let template = this.querySelector('template')

			if(template){
				this.template = template
			}
		}
		else{
			// Slots don't work correctly with optgroup & options
			for(let optgroup of this.querySelectorAll('optgroup')){
				this.container.append(optgroup)
			}
			for(let option of this.querySelectorAll('option')){
				this.container.append(option)
			}
		}

		this.bind()

		//this.addEventSlot('onSelect')
	}

	get content(){
		return this.#select
	}

	onItemsChanged(){
		this.container.innerHTML = ''

		for(let index in this.items){
			let context =
				{ item: this.items[index]
				, index
				, parent: this.parent
				}
			let element = this.template.content.cloneNode(true)

			for(let elm of element.children)
				this.binder.bindItem(context, elm)
			this.container.append(element)
		}
	}

	onItemsContentChanged(){
		super.onItemsContentChanged()

		if(this.items.length == 0)
			this.selecteditem = null
		else if(this.selecteditem === null)
			this.selecteditem = this.items[0]
	}

	onItemSelected(){
		if(this.items && this.items.length)
			this.selecteditem = this.items[this.#select ? this.#select.selectedIndex : 0]

	}

	onEditableChanged(){
		this.hideinput = !this.editable
	}
}

