import ItemsView from './items-view.js'
import {LiveObject} from '../model.js'

export default class ComboBox extends ItemsView{
	constructor(){
		super(
			[ ['name', '']
			, ['autocomplete']
			, ['selected', '', ComboBox.prototype.onItemSelected]
			, ['items', null, ComboBox.prototype.onItemsChanged]
			, ['editable', false, ComboBox.prototype.onEditableChanged, Boolean]
			, ['hideinput', true]
			])

		if(this.items){
			if(this.querySelector('optgroup, option'))
				logging.warn('Setting items and options on a select is not supported')
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

		//this.addEventSlot('onSelect')
	}

	get containerTagName(){
		return 'select'
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
			this.selecteditem = this.items[this.container ? this.container.selectedIndex : 0]
	}

	onEditableChanged(){
		this.hideinput = !this.editable
	}
}

