import {Widget} from '../widget.js'

export default class CheckBox extends Widget{
	#clicked

	constructor(){
		super(
			[ ['checked', false]
			])

		//this.addAttributeSlot('checked', 'input', false, 'input')
		//this.addBooleanAttribute('checked', 'input', false)
	}

	onCheckboxClicked(event){
		//this.#clicked.trigger({checked: this.checked})
	}
}


