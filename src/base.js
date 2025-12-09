export const BASE = import.meta.url.replace(/\/[^\/]*\.js/, '')

import {isListenable, ValueChangeEvent, LiveValue, LiveTextValue, LiveText, LiveAttribute, EventSlot, BindingExpression} from './events.js'

const NO_RECURSE_TAG =
	[ 'style', 'script', 'template'
	].reduce((table, elm) => table[elm] = null || table, { })

const ATTRIBUTE_SUBSTITUTION =
	{ 'class': 'className'
	}

const GLOBAL_PROPERTIES =
	[ [ 'draghandle', 'draggable', false, Boolean ]
	, [ 'dragtarget', null, false, Boolean ]
	, [ 'dragborder', null, false, Boolean ]

	, [ 'droptarget', null, false, Boolean ]

	, [ 'class', 'className', '', String ]
	]

const CHANGE_EVENT =
	{ input: {value: 'input', checked: 'input'}
	, textarea: {value: 'input'}
	, select: {value: 'change'}
	}

const WIDGY_WIDGETS = 
	[ 'check-box'
	, 'combo-box'
	, 'data-table'
	, 'html-view'
	, 'items-view'
	, 'number-view'
	, 'text-input'
	, 'select-widget'
	, 'tab-widget'
	]

const domParser = new DOMParser()


export async function loadWidgetClass(urlBase){
	let module = await import(urlBase+'.js')
	
	return module.default
}


async function ensureTemplate(tagName, urlBase){
	let templateId = 'widgy-template-'+tagName
	let template = document.getElementById(templateId)

	if(!template){
		let response = await fetch(urlBase+'.html')
		let text = await response.text()

		template = domParser.parseFromString(text.trim(), 'text/html').querySelector('template')
		template.id = templateId
		loadWidgets(template)
		document.querySelector('head').appendChild(template)
	}
}


async function loadWidget(tagName){
	if(customElements.get(tagName)) return

	let custom = !WIDGY_WIDGETS.includes(tagName)
	let urlBase = custom
		? Widgy.customWidgetBase + '/' + tagName
		: BASE + '/widget/' + tagName
	let widgetClass = await loadWidgetClass(urlBase)
	
	await ensureTemplate(tagName, urlBase)

	customElements.define(tagName, widgetClass)
}


export async function loadWidgets(parent){
	let tree = document.createTreeWalker(
		parent,
		NodeFilter.SHOW_ELEMENT,
		el => el.tagName.includes('-')? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP)

	while(tree.nextNode()){
		try{
			await loadWidget(tree.currentNode.localName)
		}
		catch(ex){
			console.error('Error loading widget: '+tree.currentNode.localName)
			console.exception(
				ex.message+'\n'+ex.fileName+':'+ex.lineNumber+':'+ex.columnNumber)
		}
	}
}


function hasLiveText(text){
	let live = false
	let escaped = false
	
	for(let chr of text){
		if(escaped){
			escaped = false
		}
		else if(chr === '\\'){
			escaped = true
		}
		else if(chr === '{'){
			live = true
			break
		}
	}

	return live
}


export function addProperty(object, name, initialValue, onChange, coerceType){
	function update(event){
		object[name] = event.value.value
	}
	function nativeUpdate(){
		object[propName].value = object[name]
	}

	let propName = name+'Property'

	if(object[propName] === undefined){
		let property = new LiveValue(initialValue, name, object, coerceType)

		Object.defineProperty(
			object,
			propName,
			{ value: property
			, writable: false
			, enumerable: false
			})
		if(!(name in object)){
			Object.defineProperty(
				object,
				name,
				{ get: () => property.value
				, set: (value) => property.value = value
				, enumerable: true
				})
		}
		else{
			property.addEventListener('setvalue', update)
			if(object.localName in CHANGE_EVENT && name in CHANGE_EVENT[object.localName]){
				object.addEventListener(CHANGE_EVENT[object.localName][name], nativeUpdate)
			}
		}

		if(onChange)
			property.addEventListener('setvalue', onChange)
	}
}


export function addCompositeProperty(object, name, watchProperties, evaluateCallback, onChange){
	let nameProperty = name+'Property'
	Object.defineProperties(
		object,
		{ [name]:
			{ get: () => object[nameProperty].value
			, set: (value) => object[nameProperty].value
			, enumerable: true
			}
		, [nameProperty]:
			{ value: new CompositeValue(name, object, watchProperties, evaluateCallback)
			, writable: false
			, enumerable: false
			}
		})

	if(onChange){
		object[nameProperty].addEventListener('setvalue', onChange.bind(object))
	}
}


export class Binder {
	#bindings //TODO: This is a problem. Detached child elements can leak bindings
	#boolAttributes
	#dialogs

	constructor(container){
		this.#boolAttributes = []
		this.#bindings = []
		this.#dialogs = {}
		this.container = container
	}


	get root() {
		return this.container.shadowRoot || document
	}


	get parent() {
		return this.container.parent
	}


	addBooleanAttribute(name){
		this.#boolAttributes.push(name)
	}


	addObserver(elm){
		if(elm.observer) return

		elm.observer = new MutationObserver(mutations => {
			for(let mutation of mutations){
				let property = elm[mutation.attributeName+'Property']
				let value = elm[mutation.attributeName] // TODO?
				if(property && property.value !== value){
					property._overrideValue(value)
					property.dispatchEvent(new ValueChangeEvent(property, mutation.oldValue))
				}
			}
		})

		elm.observer.observe(elm, {attributes: true})
	}


	getCallbackValue(context, property){
		let navigatedParts = ''
		let parts = property.split('.')
		let callback = parts.pop()
		let live = null
		let obj = context
		let value

		for(let part of parts){
			if(obj != null && part in obj){
				if(part+'Property' in obj)
					live = obj[part+'Property']
				else
					live = null
				obj = obj[part]
				navigatedParts += part+'.'
			}
			else{
				return null
			}
		}

		if(!(callback in obj))
			throw Error(`${context.constructor.name} has no path to event handler ${property}`)

		return obj[callback].bind(obj)
	}


	bindAttributes(context, elm){
		for(let attr of elm.attributes){
			let name = attr.name in ATTRIBUTE_SUBSTITUTION? ATTRIBUTE_SUBSTITUTION[attr.name] : attr.name
			let value

			if(attr.name.startsWith('on')){
				elm.addEventListener(
					attr.name.slice(2),
					this.getCallbackValue(context, attr.value))
				attr.value = ''
			}
			else if(attr.value.startsWith('@')){
				this.addObserver(elm)
				addProperty(elm, name, attr.value)

				value = new BindingExpression(
					attr.value.slice(1),
					context,
					elm,
					name)
				attr.bindingExpression = value
				this.#bindings.push(value)
			}
			else if(hasLiveText(attr.value)){
				this.addObserver(elm)
				addProperty(elm, name, attr.value)

				value = new LiveTextValue(attr.value, context)

				if(isListenable(elm[name]))
					elm[name].value = value
				else
					elm[name] = value
			}
			else{
				elm[name] = attr.value
			}
		}
	}


	createTreeWalker(root){
		return document.createTreeWalker(
			root,
			NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
			el => el.shadowRoot || el.localName in NO_RECURSE_TAG
				? NodeFilter.FILTER_REJECT
				: NodeFilter.FILTER_ACCEPT)
	}


	bindElement(parent, context, element, root){
		let tree = this.createTreeWalker(root)

		if(parent)
			this.bindAttributes(parent, element)

		while(tree.nextNode()){
			if(tree.currentNode.nodeType == document.ELEMENT_NODE){
				this.bindAttributes(context, tree.currentNode)

				if(tree.currentNode instanceof HTMLDialogElement && tree.currentNode.id){
					this.#dialogs[tree.currentNode.id] = tree.currentNode
				}
			}
			// TEXT_NODE
			else if(hasLiveText(tree.currentNode.textContent)){
				new LiveText(tree.currentNode, context)
			}
		}
	}


	bindItem(context, element){
		this.bindElement(context, context, element, element)
	}


	bind(){
		this.bindElement(this.parent, this.container, this.container, this.root)
	}
	/*
	bind(){
		let treeWalker = this.createTreeWalker(this.root)

		if(this.parent)
			this.bindAttributes(this.parent, this.container)

		while(tree.nextNode()){
			if(tree.currentNode.nodeType == document.ELEMENT_NODE){
				this.bindAttributes(this.container, tree.currentNode)

				if(tree.currentNode instanceof HTMLDialogElement && tree.currentNode.id){
					this.#dialogs[tree.currentNode.id] = tree.currentNode
				}
			}
			// TEXT_NODE
			else if(hasLiveText(tree.currentNode.textContent)){
				new LiveText(tree.currentNode, this.container)
			}
		}
	}
	*/


	unbind(){
		for(let binding of this.#bindings)
			binding.destroy()
	}


	openDialog(dialogId){
		this.#dialogs[dialogId].showModal()
	}


	closeDialog(dialogId){
		this.#dialogs[dialogId].close()
	}
}

export class Widgy{
	static customWidgetBase = BASE.replace(/\/[^/]+$/, '')

	sleep(until, msdelay){
		if(!msdelay)
			msdelay = 1

		return new Promise((resolve) => {
			function finished(){
				if(until())
					resolve(true)
				else
					setTimeout(finished, msdelay)
			}
			setTimeout(finished, msdelay)
		})
	}

	bindDragAndDrop(child){
		if(child.draghandle || (child.widget && child.widget.draghandle)){
			let dragTarget = this.findContainerElement(child, 'dragtarget')
			
			child.addEventListener('dragstart', event => this.rawDragStart(dragTarget, event))
		}

		if(child.droptarget || (child.widget && child.widget.droptarget)){
			let dropContainer = this.findContainerElement(child, 'dropContainer')

			if(dropContainer.widget){
				child.addEventListener('drop', event => dropContainer.widget.rawDrop(event))
				child.addEventListener('dragover', event => dropContainer.widget.rawDragover(event))
			}
			if(child.widget){
				child.addEventListener('dragenter', event => child.widget.rawDragenter(event))
				child.addEventListener('dragleave', event => child.widget.rawDragleave(event))
				child.addEventListener('drop', event => child.widget.rawDragleave(event))
			}
		}
	}

	rawDragStart(dragTarget, event){
		let targetWidget = dragTarget.widget

		if(targetWidget){
			// TODO: conversion for dragging in/out of the browser?
			//event.dataTransfer.setData(targetWidget.dragdatatype || '', targetWidget.dragdata)
			window.application.setDragData(
				targetWidget.dragdata,
				targetWidget.dragdatatype || '')
		}

		event.dataTransfer.effectAllowed = 'move'
		event.dataTransfer.setDragImage(dragTarget, 0, 0)
	}
}
