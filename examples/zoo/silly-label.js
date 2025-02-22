import {Widget, LiveValue} from './widgy/widgy.js'

export default class SillyLabel extends Widget {
	/* Super super example of a custom widget.
	 */

	constructor(application){
		super(application)

		this.addProperty('label', '')
	}
}
