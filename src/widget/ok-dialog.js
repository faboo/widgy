import BasicDialog from './basic-dialog.js'

export default class OkDialog extends BasicDialog{
	constructor(){
		super(
			[ ['title']
			, ['message']
			, ['ok-text', 'OK']
			])
	}

	okClicked(){
		this.triggerEvent('ok')
		this.close()
		this.setButtonClicked('ok')
	}
}
