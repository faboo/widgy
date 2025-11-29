Widgy Application
=====

At the simplest, an Widgy application is two made of two pieces: the root HTML, and the Application object. 

For example:

	<html>
	<head>
		<script type="module">
			import * as widgy from './widgy/widgy.js'

			class App extends widgy.Application{
				constructor(){
					super()
					this.addProperty('name', '')
				}
			}

			widgy.start(App)
		</script>
	</head>
	<body>
		<div>
			<span>What is your name?</span>

			<text-edit text="@=name"></text-edit>
		</div>
	</body>
	</html>


Widgets and Data-binding
----

Widgy has two types of data-binding: text interpolation, and property binding.

    

Models
======

While plain JS objects can be used as models for widgets, using Widgy Models allows widgets to react to changes in the
model made by other parts of the application. This lets you coordinate two widgets, or update objects from a database or
API call.

A simple Model might look this:

	import * as widgy from './widgy/widgy.js'

	class Actor extends widgy.Model {
		constructor(){
			super()
			this.addProperty('name')
			this.addProperty('birthday')
			this.addProperty('roles', new widgy.LiveArray())
			this.addCompositeProperty('age', [this.birthdayProperty], this.calcAge)
		}

		calcAge([birthday]){
			return Math.floor((birthday - new Date()) / (365*24*60*60000))
		}
	}


Widget Specifics
=======

Universal Properties:
 * application &emsp; widgy.Application\
   The current application the widget (for use in data binding).

 * class &emsp; String\
   Set the class of the widget's root element.

 * dragdata

 * dragdatatype

 * dropdatatype

 * dropcontainer &emsp; Boolean

 * dropover &emsp; Boolean

 * hidden &emsp; Boolean\
   If set and true, hides the root element of the widget.

 * id\
   Set the `id` field of the widget's root element.

 * parent &emsp; widgy.Widget\
   The widget that directly contains this one (this relationship analogous to
   the element tree).

 * shown &emsp; Boolean\
   If set, this property is the inverse of `hidden` (setting `hidden`
   appropriately).


Buttons
----

Properties:

 * default &emsp; Boolean\
	Set a button as the default button, e.g. hitting the enter key will activate
	the button.

 * data\
	Value or object sent as the `data` property of the click event.

Events:

 * onclick\
	Triggered when the button is clicked/activated.

 * onmousedown\
	Triggered when a mouse button is clicked on the button.


Gotchas
=======

Reserved Words and Prefixes
-----------

In element names and element IDs, the prefix "widgy-" is preserved for Widgy itself.

Specifically, Widgy uses:

* The "widgy-" prefix for element names in rendered HTML to avoid clashing with standard element names.

* The "widgy-style-" prefix for \<style> elements inserted into the document \<head> for widgets that define a style.


Preprocessing
-----------

The shell script, `preprocess.sh`, can be run against a source tree to compile an application's index page with all of
its templates into a single HTML file and add preloaded \<script> references to JS modules in the project source
directory. Javascript and other files in the project source directory are copied into the distribution directory.


HTML Gotchas
-----------

You should refrain from naming widgets after existing HTML elements. As an odd corner-case, some browsers (e.g. Firefox)
quietly convert <image> elements to <img>.


Live Property Gotchas
-----------

Because updating live properties of widgets and models can trigger calling complex event handlers, avoid updating live
properties in a loop.


Binding
-------

Attributes can be bound widget properties with the '@'. For example:

    <text-input text="@mytext"></text-input>

By default, changes to the `mytext` property will update the `text` property of the text-input element. That is, the
direction of the binding is "from" `mytext` "to" `text`.

You can specify the direction of the binding by adding one of '<', '>', or '=' after the '@'.

    Toward target: >
    Toward source: <
    Both ways: =


Copyright
---------

Widgy copyright 2024 Ray Wallace III
