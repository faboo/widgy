import SelectWidget from './select-widget.js'

export default class TabWidget extends SelectWidget{
	#buttons

	constructor(){
		super()

		this.selectedProperty.addEventListener('setvalue', this.onSelectedChanged.bind(this))
	}

	connectedCallback(){
		super.connectedCallback()
		this.buildTabs()
	}

	buildTabs(){
		let buttons = this.shadowRoot.querySelector('button-box')

		for(let pane of this.shadowRoot.querySelector('slot').assignedElements()){
			let key = pane.attributes['key'].value
			let title = pane.getAttribute('title') || key
			let button = document.createElement('button')

			button.innerText = title
			button.setAttribute('key', key)
			button.setAttribute('onClick', 'onTabClicked')

			this.binder.bindItem(this, button)

			buttons.appendChild(button)

			if(this.selected === null)
				this.selected = key
			if(this.selected == key)
				button.className = 'selected'
		}
	}

	onTabClicked(event){
		let button = this.shadowRoot.querySelector(`button[key="${this.selected}"]`)
		if(button) button.className = ''
		this.selected = event.target.key
		button = this.shadowRoot.querySelector(`button[key="${this.selected}"]`)
		if(button) button.className = 'selected'
	}

	onSelectedChanged(){
		if(this.bound && this.#buttons){
			for(let button of this.#buttons.children){
				if(button.key === this.selected)
					button.className = 'selected'
				else
					button.className = ''
			}
		}
	}
}
