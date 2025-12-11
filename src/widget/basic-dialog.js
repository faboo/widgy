import {Widget} from '../base.js'

export default class BasicDialog extends Widget{
	static isDialog = true
	#buttonClicked
	#resolveButtonClick

	constructor(props, dontBind){
		super(props, dontBind)
		this.dialog = this.closest('dialog')
	}
	
	get buttonClicked(){
		return this.#buttonClicked
	}

	showModal(){
		this.#buttonClicked = new Promise(resolve => {
				this.#resolveButtonClick = resolve
			})

		this.dialog.showModal()
	}

	close(){
		this.dialog.close()
	}

	setButtonClicked(buttonName){
		if(this.#resolveButtonClick)
			this.#resolveButtonClick(buttonName)
	}
}


