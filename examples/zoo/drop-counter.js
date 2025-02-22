import {Widget, LiveValue} from './widgy/widgy.js'

export default class DropCounter extends Widget {
	constructor(application){
		super(application)

		this.addProperty('countOne', 0)
		this.addProperty('countTwo', 0)

		this.dropContainer = true
	}

	onDrop(event){
		let key = event.target.getAttribute('key')

		if(key == 'one'){
			this.countOne += 1
		}
		if(key == 'two'){
			this.countTwo += 1
		}
	}
}

