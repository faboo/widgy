export const BASE = import.meta.url.replace(/\/[^\/]*\.js/, '')

import {isListenable, ValueChangeEvent, LiveValue, LiveTextValue, LiveText, LiveAttribute, WidgetEvent, BindingExpression}
	from './events.js'

const NO_RECURSE_TAG =
	[ 'style', 'script', 'template'
	].reduce((table, elm) => table[elm] = null || table, { })

const ATTRIBUTE_SUBSTITUTION =
	{ 'class': 'className'
	}

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
	, 'basic-dialog'
	, 'ok-cancel-dialog'
	, 'ok-dialog'
	]

const domParser = new DOMParser()

export const customWidgetBase = BASE.replace(/\/[^/]+$/, '')


export function setCustomWidgetBase(urlBase){
	customWidgetBase = urlBase

	if(!customWidgetBase.endsWith('/'))
		customWidgetBase += '/'
}


async function loadWidgetClass(urlBase){
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


export async function loadWidget(tagName){
	if(customElements.get(tagName)) return

	let custom = !WIDGY_WIDGETS.includes(tagName)
	let urlBase = custom
		? customWidgetBase + '/' + tagName
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
			property.value = object[name]
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


function rawDragStart(dragTarget, event){
	if(dragTarget){
		// TODO: conversion for dragging in/out of the browser?
		//event.dataTransfer.setData(dragTarget.dragdatatype || '', dragTarget.dragdata)
		window.application.setDragData(
			dragTarget.dragdata,
			dragTarget.dragdatatype || '')
	}

	event.dataTransfer.effectAllowed = 'move'
	event.dataTransfer.setDragImage(dragTarget, 0, 0)
}


function bindDragAndDrop(element){
	if(element.draghandle){
		let dragTarget = element.closest('*[dragtarget]')
		
		element.addEventListener('dragstart', event => rawDragStart(dragTarget, event))
	}

	if(element.droptarget){
		let dropContainer = element.closest('*[dropcontainer]')

		if(dropContainer instanceof Widget){
			element.addEventListener('drop', event => dropContainer.rawDrop(event))
			element.addEventListener('dragover', event => dropContainer.rawDragover(event))
		}
		if(element instanceof Widget){
			element.addEventListener('dragenter', event => element.rawDragenter(event))
			element.addEventListener('dragleave', event => element.rawDragleave(event))
			element.addEventListener('drop', event => element.rawDragleave(event))
		}
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

		if(parent){
			this.bindAttributes(parent, element)

			if(element.id && element.constructor.isDialog){
				parent.binder.#dialogs[element.id] = element
			}
		}

		while(tree.nextNode()){
			if(tree.currentNode.nodeType == document.ELEMENT_NODE){
				this.bindAttributes(context, tree.currentNode)
				bindDragAndDrop(tree.currentNode)

				if(tree.currentNode.id && tree.currentNode instanceof HTMLDialogElement){
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
		if(this.parent)
			this.bindElement(null, this.parent, this.container, this.container)
		this.bindElement(this.parent, this.container, this.container, this.root)
	}

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

export class Widget extends HTMLElement{
	static custom = true

	#bound

	constructor(props, dontBind){
		super()

		this.#bound = false
		this.parent = this.findParent()
		this.binder = new Binder(this)

		addProperty(this, 'shown', null, this.onShownChanged)
		this.#addProperties(props||[])
		this.#createShadow()

		if(!dontBind)
			this.bind()

		/* Drag and Drop */
		addProperty(this, 'dragdata')
		addProperty(this, 'dragdatatype')
		//this.addProperty('dropTarget', false, null, Boolean)
		addProperty(this, 'dropdatatype')
		addProperty(this, 'dropcontainer', false, null, Boolean)
		addProperty(this, 'dropover', false)
	}

	findParent() {
		let parentNode = this.parentNode
		
		while(!parentNode.host && parentNode.parentNode){
			parentNode = parentNode.parentNode
		}

		return parentNode.host || window.application
	}

	#createShadow(){
		const template = document.getElementById('widgy-template-'+this.localName)

		if(template){
			this.attachShadow({ mode: "open" });
			this.shadowRoot.appendChild(template.content.cloneNode(true));
		}
	}

	#addProperties(props){
		for(let prop of props){
			let name = prop[0]

			if(name !== name.toLowerCase())
				console.warn(`Widget properties should be all lowercase - ${this.constructor.name}.${name} is not`)

			if(prop[2])
				prop[2] = prop[2].bind(this)
			addProperty.apply(null, [this, ...prop])
		}
	}


	bind(){
		this.binder.bind()
		this.#bound = true
	}

	get bound(){
		return this.#bound
	}

	attributeChangedCallback(){
		console.log(arguments)
	}

	onShownChanged(){
		if(this.shown !== null)
			this.hidden = !this.shown
	}

	onDrop(event, data, type){
	}

	rawDrop(event){
		let type = this.application.getDragDataType()
		let data = this.application.takeDragData()

		event.preventDefault()

		this.onDrop(event, data, type)
	}

	rawDragover(event){
		if(!this.dropdatatype || window.application.getDragDataType() == this.dropdatatype){
			//event.dataTransfer.dropEffect = 'move'
			event.preventDefault()
		}
		else{
			//event.dataTransfer.dropEffect = 'none'
		}
	}

	rawDragenter(event){
		this.dropover = true
	}

	rawDragleave(event){
		this.dropover = false
	}

	isVisible(){
		let hasSize = this.root.offsetWidth || this.root.offsetHeight || this.root.getClientRects().length

		return !!hasSize
	}

	triggerEvent(name, data){
		let event = new WidgetEvent(name, this, data)
		this.dispatchEvent(event)
	}

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
}

