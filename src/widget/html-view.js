import {Widget} from '../widget.js'

export default class HtmlView extends Widget{
	constructor(){
		super(
			[ ['html', '', HtmlView.prototype.onHtmlChanged]
			])
	}

	onHtmlChanged(){
		this.shadowRoot.innerHTML = this.html
	}
}



