import {Widget} from '../base.js'

export default class BasicDialog extends Widget{
	static isDialog = true
	#buttonClicked
	#resolveButtonClick

	constructor(props){
		super(props)
	}
	
	get buttonClicked(){
		return this.#buttonClicked
	}

	connectedCallback(){
		super.connectedCallback()
		this.dialog = this.closest('dialog')
		if(!this.dialog)
			console.error(`Derivitives of BasicDialog must be wrapped in a <dialog> element - ${this.constructor.name} is not`)
	}

	adoptedCallback(){
		super.adoptedCallback()
		this.dialog = this.closest('dialog')
		if(!this.dialog)
			console.error(`Derivitives of BasicDialog must be wrapped in a <dialog> element - ${this.constructor.name} is not`)
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


