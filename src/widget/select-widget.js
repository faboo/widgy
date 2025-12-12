import {Widget} from '../base.js'

export default class SelectWidget extends Widget{
	constructor(){
		super(
			[ ['selected',  null, SelectWidget.prototype.onSelectedChanged]
			])
	}

	onSelectedChanged(){
		for(let elm of this.shadowRoot.querySelector('slot').assignedElements()){
			if(elm.attributes['key'].value != this.selected)
				elm.setAttribute('hidden', '')
			else
				elm.removeAttribute('hidden')
			//elm.hidden = elm.attributes['key'].value != this.selected
		}
	}
}
