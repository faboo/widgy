export {LiveValue, ValueChangeEvent} from './events.js'
export {Widget} from './base.js'
export {Application} from './application.js'
export {Model, LiveObject, LiveArray} from './model.js'
export {View, ArrayView} from './view.js'
export {RemoteStore, Dropbox, DatabaseEvent} from './storage.js'

import {Widget, setCustomWidgetBase, loadWidgets, loadWidget} from './base.js'
import {Application} from './application.js'

export function preloadWidget(name){
	loadWidget(name)
}

export async function start(appClass, customWidgetBase){
	if(customWidgetBase)
		setCustomWidgetBase(customWidgetBase)

	if(appClass == undefined)
		appClass = Application

	window.application = new appClass()

	await loadWidgets(document.body)

	await window.application.init()
	window.application.loadInitialPath()

	return window.application
}

