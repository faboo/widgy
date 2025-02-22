import Button from './widgy/widget/button.js'

export default class ImageButton extends Button {
	/* This widget doesn't define its own template - the base one is fine!
	 * Useful for simply redefining behavior. In this case, we just want to
	 * always show an image, rather than arbitrary content in the button.
	 */

	constructor(){
		super()

		this.addProperty('src')
	}

	getSpecialWidget(element){
		let content = document.createElement('img')
		
		content.setAttribute('src', '@src')
		this.bindAttributes(this, content)

		return content
	}
}
