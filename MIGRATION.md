# Migration guide

# Version 1.1.0

In version 1.1.0, changes were made in the metadata API. The SDK lets you access schema as JSON objects (method `client.getSchema`) or provides an object model around schemas with typed objects, as in https://experienceleague.adobe.com/developer/campaign-api/api/c-Schema.html, which can be accessed with `application.getSchema`.


The following potentially breaking changes were introduced

* Schemas retreived by `application.getSchema` are cached in memory
* Attributes without an explicit type will be reported as `string` type instead of empty type
* The `userDescription` property removed from `XtkSchemaNode` and only available on `XtkSchema`
* The `children` of a `XtkSchemaNode` are now reported in the same order as they appear in the schema
* Implicit values are propagated for `XtkSchemaNode` and enumeration. It means that empty labels and desciptions not have a non empty value infered from the name attribute
* The `XtkSchemaNode.hasChild` function has been removed
* Enumerations of a schema, values of an enumeration, children of a schema node, keys of a schema, and fields of a key are now returned as a `ArrayMap` type instead of a key/value. This change allows to access elements as either an array or a dictionary, or map, filter, iterate through elements.
* The string representation of schema nodes : `XtkSchema.toString` and `XtkSchemaNode.toString` has changed
* The `XtkSchemaNode.findNode` method is now asynchronous and its signature has changed
* The name attribute of enumerations is now always the fully qualified name (ex: `nms:recipient:gender` instead of `gender`). The non qualified name is still available with the `shortName` property.

## In-memory cache
Schema objects have their own in-memory cache, in addition to the SDK cache

## Attribute type
Attributes with no type are now reported as `string`.

Before
```js
// Deprecated syntax
if (!attribute.type || attribute.type === "string") ...
```

After
```js
if (attribute.type === "string") ...
```

or better, use `XtkCaster.isStringType` which will handle all variant of string types, such as `memo`, `html`, etc.
```js
if (XtkCaster.isStringType(attribute.type)) ...
```

## userDescription property
The `userDescription` property was set on the `XtkSchemaNode` object and has been moved to the `XtkSchema` object

## Order of children
The order of children of a node has been changed. Beore 1.1.0, it was attributes, then elements. After 1.1.0, it's the order defined in the schema XML

## Propagate implicit values
Automatically set schema nodes label and description properties if they are not set.
* Schema node. If a node does not have a label, the SDK will generate a label from the name (with first letter in upper case) instead of returning an empty string. Similarly, the node description property will be set from the label.
* enumeration label will be set with the same rules

## Removed hasChild function
The function `XtkSchemaNode.hasChild` has been removed.

Before
```js
// Deprecated syntax (will fail at runtime)
if (node.hasChild("@email")) { ... }
```

After
```js
if (!node.children.get("@email")) { ... }
```

## ArrayMaps
Collection of child elements which were accessed as maps are now accessed with a special `ArrayMap` object which allows to access them either as maps of arrays and include convenience functions for iteration
* fields of a key (`XtkSchemaKey.fields`)
* chldren of a node (`XtkSchemaNode.children`)
* keys of a node (`XtkSchemaNode.keys`)
* values of an enumeration (`XtkEnumeration.values`)
* enumerations of a schema (`XtkSchema.enumerations`)

As a consequence, it's deprecated to access the properties above by name. It still works in most of the cases, but will fail for object whose name collides with JavaScript function names. For exampl, for an element named 'forEach'.

Instead, use one of the following constructs.

To iterate over a collection, use `map`, `forEach`, or a `for ... of` loop. Do not use the for ... in loop.

Before
```js
// Not supported anymore. Will only work in some cases
for (key in node.children) { const child = node.children[key]; ... }
```

After
```js
node.children.forEach(child => ...);
node.children.map(child => ...);
for (child of node.children) { ... }
for (let i=0 i<node.children.lenght; i++) { const child = node.children[i]; ... }
```

Collection items can be accessed by name or index with the `get` function, or with an array index.

Before
```js
// Not supported anymore. Will only work in some cases
const child = node.children["@email"];
```

After

```js
const child = node.children[3];
const child = node.children.get(3);
const child = node.children.get("@email");
```


## Schema and SchemaNode toString
The `toString` function has been changed to better display a node structure. In general, this function is mostly for debugging purpose, and you should not rely on the exact output.

## XtkSchemaNode.findNode
The `findNode` function has been modified in multiple ways.

* The function is now **asynchronous** and returns a Promise. The reason is that in order to support all the use cases supported in Campaign JS API, findNode needs to follow references and links, and therefore may have to dynamically load schemas.

* The function now supports `ref` nodes. Ref nodes are schema nodes having a `ref` property which is a reference to another node, possibly in a different schema. 
    * If the xpath passed to the function ends with a ref node, the ref node itself will be returned. We're not following the reference. You can use the `refTarget` method to explicitely follow the reference
    * If the xpath traverse intermediate nodes which are ref nodes, the `findNode` method will follow the reference. For instance, the start activity in a workflow is a reference. Finding the xpath "start/@img" will follow the start reference and find the @img attribute from there

* Support of type `ANY`. The type `ANY` in Campaign is used to describe a node which can contain arbitrary child nodes, without any strongly defined structure. The `findNode` function will only be able to return direct children of a node of `ANY` type.

* Support for links. If the xpath parameter contains links, `findNode` will follow the link target with the same rules as for reference nodes. To get the target of a link, use the `linkTarget` method instead of `refTarget`.

* The `findNode` function now takes only one parameter: the xpath to search for. The `strict` and `mustExist` parameters were removed. The function is now always in strict mode, i.e. will not try to guess if you're searching for an element or attribute. The function will only throw if the schema it's working on are malformed. For instance, if the target property of a link is not a syntaxically correct schema id. If however, the node you're looking for does not exist, or if an intermediate node or schema does not exist, findNode will simply return null or undefined, and will not throw. The `mustExist` param may be reintroduced in the future for better error reporting.


Basic usage of `findNode`


Before
```js
// Deprecated, will not work anymore
try {
  const email = schema.root.findNode("@email");
} catch(error) {
  // maybe @email does not exist, or maybe the schema is invalid
}
```

After
```js
try {
  const email = await schema.root.findNode("@email");
  if (!email) {
    // @email does not exist
  }
} catch(error) {
  // schema is invalid
}
```


## Enumeration name

* The name attribute of enumerations (`XtkEnumeration.name`) is now the fully qualified name of the enumeration, i.e. is prefixed by the schema id