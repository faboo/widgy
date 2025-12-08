import {Widget} from '../widget.js'

export default class CheckBox extends Widget{
	#clicked

	constructor(){
		super(
			[ ['checked', false]
			])
	}
}


