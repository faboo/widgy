import {LiveValue} from '../events.js'
import {Widget} from '../widget.js'
import {Model} from '../model.js'

export default class DataTable extends Widget{
	#template
	#table
	#rows
	#context
	#scrolling
	#resizing

	constructor(){
		super(
			[ ['items', null, DataTable.prototype.onItemsChanged]
			, ['offset', 0]
			])

		this.rowHeight = null
		this.headings = []
		this.widths = []
		this.#scrolling = false
		this.#resizing = false
		this.#template = this.getTemplate()
		this.#table = this.shadowRoot.querySelector('table')
		this.#rows = this.shadowRoot.querySelector('tbody')

		this.onItemsContentChanged = this.onItemsContentChanged.bind(this)
		this.adjustBoundItems = this.adjustBoundItems.bind(this)
		this.resetSize = this.resetSize.bind(this)

		this.shadowRoot.addEventListener('scroll', this.onScroll.bind(this))
		window.addEventListener('resize', this.onResize.bind(this))

		this.buildThead()
		this.updateItems()
	}

	getTemplate(){
		let columns = this.querySelectorAll('data-col')
		let template = document.createElement('tr')
		let fillCell = []
		let fillIndex = []
		let totalWidth = 0
		let fillWidth = 0
		
		for(let columnIdx = 0; columnIdx < columns.length; columnIdx += 1){
			let column = columns[columnIdx]
			let cell = document.createElement('td')
			let heading = column.getAttribute('heading')
			let width = column.getAttribute('width') || '*'

			cell.innerHTML = column.innerHTML
			cell.setAttribute('part', 'td')
			template.appendChild(cell)
			this.headings.push(heading)
			this.widths.push(width)

			if(width == '*'){
				fillCell.push(cell)
				fillIndex.push(columnIdx)
			}
			else{
				totalWidth += parseInt(width, 10)
			}
		}

		if(fillCell.length){
			fillWidth = Math.max((100 - totalWidth) / fillCell.length, 0)

			for(let index in fillCell){
				this.widths[fillIndex[index]] = fillWidth
			}
		}

		return template
	}


	async measureRow(){
		let item = this.items[0]
		let row = this.createRowElement()
		let rect
		
		this.bindRowElement(row, item, 0)

		//this.#rows.appendChild(row)

		this.insertRow(row)

		rect = row.getBoundingClientRect()

		this.rowHeight = rect.height
	}

	createRowElement(index, item){
		let row = this.#template.cloneNode(true)
		let context = Model.create(
			{ item
			, index
			, parent: this.parent
			})

		row.widget = this
		row.context = context

		for(let elm of row.children)
			this.binder.bindItem(context, row)

		for(let index in this.widths){
			let width = this.widths[index]
			row.children[index].setAttribute('style', `width: ${width}%`)
		}

		row.setAttribute('style', `top: ${top}px`)

		return row
	}

	bindRowElement(row, value, index){
		let top = index * (this.rowHeight || 0)

		row.context.item = value
		row.context.index = index + 1

		row.liveValue = value

		row.setAttribute('style', `top: ${top}px`)
	}

	buildThead(){
		let head = this.shadowRoot.querySelector('thead')
		let row = document.createElement('tr')

		for(let index in this.headings){
			let heading = this.headings[index]
			let width = this.widths[index]
			let cell = document.createElement('th')

			cell.setAttribute('part', 'th')

			if(heading)
				cell.textContent = heading
			else
				cell.innerHTML = '&nbsp;'
			cell.setAttribute('style', `width: ${width}%`)

			row.appendChild(cell)
		}

		head.appendChild(row)
	}

	async updateItems(){
		let bodyHeight
		let tableHeight = this.getBoundingClientRect().height

		this.#rows.innerHTML = ''
		this.scrollTo(0, 0)

		// Make sure we know how big a row is
		if(this.items.length && this.rowHeight === null){
			await this.measureRow()
		}

		// Set the scrollable area to match how many items we have (virtual
		// rows)
		bodyHeight = this.rowHeight * this.items.length
		this.#rows.setAttribute('style', `height: ${bodyHeight}px`)

		this.adjustBoundItems()
	}

	onScroll(event){
		if(!this.#scrolling){
			this.#scrolling = true
			window.requestAnimationFrame(this.adjustBoundItems)
		}
	}

	onResize(event){
		if(!this.#resizing){
			this.#resizing = true
			window.requestAnimationFrame(this.resetSize)
		}
	}

	resetSize(){
		this.rowHeight = null
		this.#resizing = false
		this.#rows.innerHTML = ''

		this.updateItems()
	}

	insertRow(row){
		let beforeRow = null

		for(let candidate of this.#rows.childNodes){
			if(row.context.index == candidate.context.index){
				console.log('Row already exists: ')
				console.log(row)
			}

			if(row.context.index < candidate.context.index){
				beforeRow = candidate
				break
			}
		}
		
		if(beforeRow)
			this.#rows.insertBefore(row, beforeRow)
		else
			this.#rows.appendChild(row)
	}

	adjustBoundItems(){
		let tableHeight = this.getBoundingClientRect().height
		let priorFirstIndex = 0
		let firstIndex = Math.max(0, Math.floor(this.scrollTop / this.rowHeight) - 2)
		let lastIndex = Math.min(
			this.items.length - 1,
			Math.floor((this.scrollTop + tableHeight) / this.rowHeight) + 2)
		let freeRows = []
		let assignedIndexes = {}

		this.#scrolling = false
		this.offset = this.scrollTop

		// Free up bindable rows that aren't visible
		for(let row of this.#rows.children){
			let index = row.context.index - 1

			if(priorFirstIndex === 0)
				priorFirstIndex = index

			if(index < firstIndex || index > lastIndex){
				freeRows.push(row)
			}
			else{
				assignedIndexes[index] = true

				// Update this item if it changed
				if(row.context.item !== this.items.at(index))
					this.bindRowElement(row, this.items.at(index), index)
			}
		}

		// Only rebind rows if we're starting from the first element, or if
		// we've scrolled an even number of rows. This keeps CSS's nth() feature
		// working correctly.
		if(firstIndex === 0 || !((priorFirstIndex - firstIndex) % 2)){
			// Remove extra rows
			for(let freeRow of freeRows)
				freeRow.remove()

			// Bind newly visible items.
			for(let index = firstIndex, position = 0; index <= lastIndex; ++index, ++position){
				if(!(index in assignedIndexes)){
					let row = freeRows.length? freeRows.pop() : this.createRowElement()

					this.bindRowElement(row, this.items.at(index), index)

					this.insertRow(row)
				}
			}
		}
	}

	onItemsChanged(event){
		if(event.oldValue)
			event.oldValue.removeEventListener('setvalue', this.onItemsContentChanged)

		if(this.bound){
			this.#rows.innerHTML = ''
			this.resetSize()
			this.updateItems()
		}

		this.items.addEventListener('setvalue', this.onItemsContentChanged)
	}

	onItemsContentChanged(){
		if(this.bound)
			this.updateItems()
	}
}
