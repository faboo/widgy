import BasicDialog from './basic-dialog.js'

export default class OkCancelDialog extends BasicDialog{
	constructor(){
		super(
			[ ['title']
			, ['message']
			, ['ok-text', 'OK']
			, ['cancel-text', 'Cancel']
			])
	}

	okClicked(){
		this.triggerEvent('ok')
		this.close()
		this.setButtonClicked('ok')
	}

	cancelClicked(){
		this.triggerEvent('cancel')
		this.close()
		this.setButtonClicked('cancel')
	}
}

OkCancelDialog.elementName = 'ok-cancel-dialog'
OkCancelDialog.safeElementName = 'ok-cancel-dialog'
