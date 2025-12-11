import {Widget} from '../base.js'

export default class CheckBox extends Widget{
	#clicked

	constructor(){
		super(
			[ ['checked', false]
			])
	}
}


