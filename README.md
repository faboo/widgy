Reserved Words and Prefixes
-----------

In element names and element IDs, the prefix "widgy-" is preserved for Widgy itself.

Specifically, Widgy uses:

* The "widgy-" prefix for element names in rendered HTML to avoid clashing with standard element names.

* The "widgy-style-" prefix for \<style> elements inserted into the document \<head> for widgets that define  style.


Preprocessing
-----------

The shell script, `preprocess.sh`, can be run against a source tree to compile an application's index page with all of
its templates into a single HTML file. Javascript and other files in the project source directory are copied into the
distribution directory.


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
