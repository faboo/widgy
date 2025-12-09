import {Widget} from '../widget.js'

export default class SelectWidget extends Widget{
	constructor(){
		super(
			[ ['selected',  null, SelectWidget.prototype.onSelectedChanged]
			])
	}

	onSelectedChanged(){
		for(let elm of this.shadowRoot.querySelector('slot').assignedElements()){
			elm.hidden = elm.attributes['key'].value != this.selected
		}
	}
}
