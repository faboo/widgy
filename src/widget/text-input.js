import {Widget} from '../base.js'

export default class TextInput extends Widget{
	#input

	constructor(){
		super(
			[ ['text', '']
			, ['placeholder', '']
			, ['completer']
			])

		let input = this.shadowRoot.querySelector('input')

		input.addEventListener('keyup', this.completeText.bind(this))
	}

	async completeText(event){
		if(!this.completer) return

		let input = this.firstElement('input')
		let cursorPos = input.selectionStart

		if(event.key !== 'Backspace' && input.value && cursorPos == input.value.length){
			try{
				let fill = this.completer(input.value)

				if(fill instanceof Promise)
					fill = await fill

				if(fill !== null){
					this.text = fill
					input.selectionStart = cursorPos
					input.selectionEnd = fill.length
				}
			}
			catch(ex){
				console.error('<text-input> completer failed')
				console.exception(ex)
			}
		}
	}
}

