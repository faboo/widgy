export const BASE = import.meta.url.replace(/\/[^\/]*\.js/, '')

import {isListenable, ValueChangeEvent, LiveValue, LiveTextValue, LiveText, LiveAttribute, EventSlot, BindingExpression} from './events.js'
import {LiveObject} from './model.js'

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
	{ input: {value: 'input'}
	, textarea: {value: 'input'}
	}

const WIDGY_WIDGETS = 
	[ 'check-box'
	, 'data-table'
	, 'html-view'
	, 'items-view'
	, 'number-input'
	, 'number-view'
	, 'text-input'
	]

const domParser = new DOMParser()


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
	//TODO: use a tree walker?
	// Document.createTreeWalker(parent, NodeFilter.SHOW_ELEMENT, el => el.tagName.includes('-')? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP)
	for(let child of parent.children){
		if(child.tagName.includes('-')){
			try{
				await loadWidget(child.localName)
			}
			catch(ex){
				console.exception(ex)
			}
		}
		else{
			await loadWidgets(child)
		}
	}
}


export function hasLiveText(text){
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


export class Binder {
	#bindings

	constructor(container){
		this.container = container
		this.#bindings = []
	}

	get root() {
		return this.container.shadowRoot || document
	}

	get parent() {
		return this.container.parent
	}


	addObserver(elm){
		if(elm.observer) return

		elm.observer = new MutationObserver(mutations => {
			for(let mutation of mutations){
				let property = elm[mutation.attributeName+'Property']
				let value = elm.attributes[mutation.attributeName].value
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
			let value

			if(attr.name.startsWith('on')){
				elm.addEventListener(
					attr.name.slice(2),
					this.getCallbackValue(context, attr.value))
			}
			else if(attr.value.startsWith('@')){
				this.addObserver(elm)
				addProperty(elm, attr.name, attr.value)

				value = new BindingExpression(
					attr.value.slice(1),
					context,
					elm,
					attr.name)
				attr.bindingExpression = value
				this.#bindings.push(value)
				
			}
			else if(hasLiveText(attr.value)){
				this.addObserver(elm)
				addProperty(elm, attr.name, attr.value)

				value = new LiveTextValue(attr.value, context)

				if(isListenable(elm[name]))
					elm[name].value = value
				else
					elm[name] = value
			}
			else{
				elm[attr.name] = attr.value
			}
		}
	}


	bind(){
		let tree = document.createTreeWalker(
			this.root,
			NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
			el => el.shadowRoot || el.localName in NO_RECURSE_TAG
				? NodeFilter.FILTER_REJECT
				: NodeFilter.FILTER_ACCEPT)

		if(this.parent)
			this.bindAttributes(this.parent, this.container)

		while(tree.nextNode()){
			if(tree.currentNode.nodeType == document.ELEMENT_NODE){
				console.log(tree.currentNode)
				this.bindAttributes(this.container, tree.currentNode)
			}
			// TEXT_NODE
			else if(hasLiveText(tree.currentNode.textContent)){
				console.log(tree.currentNode)
				new LiveText(tree.currentNode, this.container)
			}
		}
	}

	unbind(){
		for(let binding of this.#bindings)
			binding.destroy()
	}
}

export const LoadedWidget = { }

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

	firstElement(selector){
		let root = this.root.shadowRoot || this.root

		if(selector)
			return root.querySelector(selector)
		else
			return root
	}

	findContainerElement(child, boolProp){
		let lookback = 10
		let container = null
		let element = child

		while(element && lookback && !container){
			if(element[boolProp] || (element.widget && element.widget[boolProp]))
				container = element

			lookback -= 1
			element = element.parentElement
		}

		return container || child
	}

	resolveCompositeValue(context, target, name, value){
		let resolvedValue = value

		if(value){
			if(value.startsWith('@')){
				resolvedValue = this.createBindingExpression(
					value.slice(1),
					context,
					target,
					name)
			}
			else if(context.hasLiveText(value)){
				resolvedValue = new LiveTextValue(value, context)
			}
		}

		return resolvedValue
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
			window.currentApplication.setDragData(
				targetWidget.dragdata,
				targetWidget.dragdatatype || '')
		}

		event.dataTransfer.effectAllowed = 'move'
		event.dataTransfer.setDragImage(dragTarget, 0, 0)
	}
}
