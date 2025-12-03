export {LiveValue, ValueChangeEvent, SlottedEvent} from './events.js'
export {Widgy} from './base.js'
export {Widget} from './widget.js'
export {Application} from './application.js'
export {Model, LiveObject, LiveArray} from './model.js'
export {View, ArrayView} from './view.js'
export {RemoteStore, Dropbox, DatabaseEvent} from './storage.js'

import {Widgy, loadWidgets, loadWidgetClass} from './base.js'
import {Application} from './application.js'

export function preloadWidget(name){
	loadWidgetClass(Widgy.customWidgetBase+name)
}

export async function start(appClass, customWidgetBase){
	if(customWidgetBase)
		Widgy.customWidgetBase = customWidgetBase

	if(appClass == undefined)
		appClass = Application

	window.application = new appClass()

	await loadWidgets(document.body)

	await window.application.init()
	window.application.loadInitialPath()

	return window.application
}

export async function _start(appClass, customWidgetBase){
	let html = document.firstElementChild
	let application

	if(customWidgetBase)
		Widgy.customWidgetBase = customWidgetBase

	if(appClass == undefined)
		appClass = Application

	application = new appClass()

	Application.currentApplication = application
	window.currentApplication = application
	window.application = application

	await application.init()

	application.loadInitialPath()

	return application
}
