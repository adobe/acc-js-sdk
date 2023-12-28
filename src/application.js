/*
Copyright 2020 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/
(function() {
"use strict";


/**********************************************************************************
 * 
 * SDK "application" object
 * https://docs.adobe.com/content/help/en/campaign-classic/technicalresources/api/c-Application.html
 * 
 *********************************************************************************/
const { DomException, DomUtil, XPath } = require('./domUtil.js');
const XtkCaster = require('./xtkCaster.js').XtkCaster;
const EntityAccessor = require('./entityAccessor.js').EntityAccessor;
const { ArrayMap } = require('./util.js');

const PACKAGE_STATUS = { "never": 0, "always": 1, "default": 2, "preCreate": 3 };

/**
 * @namespace Campaign
 */

// ========================================================================================
// Helper functions
// ========================================================================================

/**
  * Creates a schema object from an XML representation.
  * The returned XtkSchema object will not be added to the application schema cache.
  * If you do not pass an application object, it will not be possible to follow
  * references or get enumeration values from the returned XtkSchema
  * 
  * @private
  * @param {DOMElement|DOMDocument} xml the XML document or element representing the schema
  * @param {Campaign.Application|undefined} the application object which will be used to follow links and references
  * @returns {XtkSchema} a schema object
  * @see {@link XtkSchema}
  * @memberof Campaign
  */
 function newSchema(xml, application) {
    if (xml.nodeType == 9) xml = xml.documentElement;       // Document -> element
    var schema = new XtkSchema(application, xml);
    return schema;
}

// Propagate implicit values
// Name -> Label -> Desc -> HelpText
function propagateImplicitValues(xtkDesc, labelOnly) {
    if (!xtkDesc.label) {
        if (xtkDesc.isAttribute) xtkDesc.label = xtkDesc.name.substring(1); // without @
        else xtkDesc.label = xtkDesc.name;
        // Force first letter as uppercase
        xtkDesc.label = xtkDesc.label.substring(0, 1).toUpperCase() + xtkDesc.label.substring(1);
    }
    if (!labelOnly && !xtkDesc.description) {
        xtkDesc.description = xtkDesc.label;
        xtkDesc.descriptionLocalizationId = xtkDesc.labelLocalizationId;
    }
}

// ========================================================================================
// Schema Cache
// ========================================================================================

/**
 * A cache of schemas of type `XtkSchema` instead of plain XML or JSON objects
 * 
 * @private
 * @class
 * @constructor
 * @memberof Campaign
 */

class SchemaCache {
    constructor(client) {
        this._client = client;
        this._schemas = {};
    }

    /**
      * Get a schema by id from schema cache of type `XtkSchema` 
     * 
     * @param {string} schemaId 
     * @returns {Campaign.XtkSchema} the schema, or null if the schema was not found
     */
    async getSchema(schemaId) {
        let schema = this._schemas[schemaId];
        if (schema === undefined) {
            schema = await this._client.application._getSchema(schemaId);
            if (!schema) schema = null; // null = not found
            if (!schemaId.startsWith("temp:group:"))
                this._schemas[schemaId] = schema;
        }
        return schema;
    }

    /**
      * Remove a schema from schema cache. The callback function when refreshing cache in cacheRefresher 
     * 
     * @param {string} schemaId 
     */
    invalidateCacheItem(schemaId) {
        this._schemas[schemaId] = undefined;
    }
}

// ========================================================================================
// Keys
// ========================================================================================

/**
 * A key in a schema
 * 
 * @private
 * @class
 * @constructor
 * @param {Campaign.XtkSchema} schema
 * @param {} xml
 * @param {Campaign.XtkSchemaNode} schemaNode
 * @memberof Campaign
 */
class XtkSchemaKey {

    constructor(schema, xml, schemaNode) {

        /**
         * The schema this key belongs to
         * @type {Campaign.XtkSchema}
         */
        this.schema = schema;

        /**
         * The name of the key
         * @type {string}
         */
        this.name = EntityAccessor.getAttributeAsString(xml, "name");

        /**
         * A human friendly name for they key
         * @type {string}
         */
        this.label = EntityAccessor.getAttributeAsString(xml, "label");

         /**
         * A longer, human friendly description for they key
         * @type {string}
         */
        this.description = EntityAccessor.getAttributeAsString(xml, "desc");

        /**
         * Indicates if the key is internal or not
         * @type {boolean}
         */
        this.isInternal = EntityAccessor.getAttributeAsBoolean(xml, "internal");

        /**
         * Indicates if the fields (parts) of a composite key may be empty (null). At least one part must always be populated
         * @type {boolean}
         */
        this.allowEmptyPart = EntityAccessor.getAttributeAsString(xml, "allowEmptyPart");

        /**
         * The fields making up the key
         * @type {Utils.ArrayMap<Campaign.XtkSchemaNode>}
         */
        this.fields = new ArrayMap();

        for (var child of EntityAccessor.getChildElements(xml, "keyfield")) {
            const xpathString = EntityAccessor.getAttributeAsString(child, "xpath");
            if (xpathString == "") throw new DomException(`Cannot create XtkSchemaKey for key '${this.name}': keyfield does not have an xpath attribute`);
            
            // find key field
            const xpath = new XPath(xpathString);
            const elements = xpath.getElements();
            let keyNode = schemaNode;
            while (keyNode && elements.length > 0)
                keyNode = keyNode.children[elements.shift()];
            if (keyNode)
            this.fields._push(xpathString, keyNode);
        }
    }
}

/**
 * A join in a XtkSchemaNode link type
 *
 * @private
 * @class
 * @constructor
 * @param {} xml
 * @memberof Campaign
 */
 class XtkJoin {

    constructor(xml) {

        /**
         * The xpath of the join condition on the source table
         * @type {string}
         */
        this.src = EntityAccessor.getAttributeAsString(xml, "xpath-src");

        /**
         * The xpath of the join condition on the destination table
         * @type {string}
         */
         this.dst = EntityAccessor.getAttributeAsString(xml, "xpath-dst");
    }
}

// ========================================================================================
// Schema nodes
// ========================================================================================

/**
 * A Schema Node (CXtkNodeDef). Schemas are a hierarchy of nodes. The top-level node (i.e. the
 * schema itself is also a node). The "root" node is the first child node having the same name
 * as the schema itself
 * 
 * @private
 * @class
 * @constructor
 * @memberof Campaign
 */
class XtkSchemaNode {

    constructor() {
    }
    
    /**
     * Initialize a schema node recursively
     * @param {Campaign.XtkSchema} schema The schema this node belongs to
     * @param {XML.XtkObject} xml The XML or JSON definition of the schema node
     * @param {Campaign.XtkSchemaNode} parentNode the parent node, can be undefined for the schema top level node (the schema itself)
     * @param {boolean} isAttribute indicates whether the node is an attribute node or an element node
     */
    init(schema, xml, parentNode, isAttribute) {

        /**
         * The schema the node belongs to
         * @type {XtkSchema}
         */
        this.schema = schema;

        /**
         * Returns a string of characters which provides the data policy of the current node.
         * @type {string}
         */
         this.dataPolicy = EntityAccessor.getAttributeAsString(xml, "dataPolicy");

        /**
         * Returns a string of characters which provides the db enum of the current node.
         * @type {string}
         */
        this.dbEnum = EntityAccessor.getAttributeAsString(xml, "dbEnum");

        /**
         * Returns a string of characters which specifies the editing type of the current node.
         * @type {string}
         */
         this.editType = EntityAccessor.getAttributeAsString(xml, "edit");

        /**
         * Only on the root node, returns a string which contains the folder template(s). On the other nodes, it returns undefined.
         * @type {string}
         */
        this.folderModel = EntityAccessor.getAttributeAsString(xml, "folderModel");

        /**
         * The parent node
         * @type {XtkSchemaNode}
         */
        this.parent = parentNode;

        /**
         * Indicates if the node is an attribute or not (element or schema itself)
         * @type {boolean}
         */
        this.isAttribute = isAttribute;

        /**
         * The attribute or the node name (with the "@" sign for attributes)
         * @type {string}
         */
        this.name = (this.isAttribute ? "@" : "") + EntityAccessor.getAttributeAsString(xml, "name");

        /**
         * A human friendly name for the node. If the node is the schema node, the label will be in the plural form and "labelSingular"
         * should be used for the singular form
         * @type {string}
         */
        this.label = EntityAccessor.getAttributeAsString(xml, "label");

        /**
         * A long description of the node
         * @type {string}
         */
        this.description = EntityAccessor.getAttributeAsString(xml, "desc");

        /**
         * An optional image for the node
         * @type {string}
         */
        this.img = EntityAccessor.getAttributeAsString(xml, "img");

        /**
         * An optional image for the node (alias to the img property)
         * @type {string}
         */
         this.image = this.img;

        /**
         * Returns the name of the image of the current node in the form of a string of characters.
         * @type {string}
         */
         this.enumerationImage = EntityAccessor.getAttributeAsString(xml, "enumImage");

        /**
         * The node type. Attribute nodes without an explicitedly defined type will be reported as "string"
         * @type {string}
         */
        this.type = EntityAccessor.getAttributeAsString(xml, "type");
        if (!this.type && isAttribute) this.type = "string";

        /**
         * For link type nodes, the target of the link
         * @type {string}
         */
        this.target = EntityAccessor.getAttributeAsString(xml, "target");

        /**
         * The node integrity
         * @type {string}
         */
        this.integrity = EntityAccessor.getAttributeAsString(xml, "integrity");

        /**
         * The node data length (applicable for string-types only)
         * @type {number}
         */
        this.length = EntityAccessor.getAttributeAsLong(xml, "length");

        /**
         * The node data length (applicable for string-types only)
         * @type {number}
         */
        this.size = this.length;

        /**
         * The enum of the node
         * @type {string}
         */
        this.enum = EntityAccessor.getAttributeAsString(xml, "enum");

        /**
         * Returns a string of characters which is the name of the user enumeration used by the current node.
         * @type {string}
         */
        this.userEnumeration = EntityAccessor.getAttributeAsString(xml, "userEnum");

        /**
         * Returns a boolean which indicates whether the value of the current node is linked to a user enumeration.
         * @type {boolean}
         */
        this.hasUserEnumeration = !!this.userEnumeration;

        /**
         * "ref" attribute of the node, which references another node
         * @type {string}
         */
        this.ref = EntityAccessor.getAttributeAsString(xml, "ref");

        /**
         * Has an unlimited number of children of the same type
         * @type {boolean}
         */
        this.unbound = EntityAccessor.getAttributeAsBoolean(xml, "unbound");

        /**
         * If children are ordered
         * @type {boolean}
         */
        this.ordered = EntityAccessor.getAttributeAsBoolean(xml, "ordered");

        /**
         * The expression controlling the visibility of the current node
         * @type {string}
         */
        this.visibleIf = EntityAccessor.getAttributeAsString(xml, "visibleIf");

        /**
         * Has an unlimited number of children of the same type
         * @type {boolean}
         */
        this.isCollection = this.unbound;

        /**
         * is mapped as a xml
         * @type {boolean}
         */
        this.isMappedAsXML = EntityAccessor.getAttributeAsBoolean(xml, "xml");

        /**
         * is an advanced node
         * @type {boolean}
         */
        this.isAdvanced = EntityAccessor.getAttributeAsBoolean(xml, "advanced");

        /**
         * if returning the whole node when camparing difference
         * @type {boolean}
         */
        this.doesNotSupportDiff = EntityAccessor.getAttributeAsBoolean(xml, "doesNotSupportDiff");

        /**
         * Children of the node. This is a object whose key are the names of the children nodes (without the "@"
         * character for attributes) 
         * @type {Utils.ArrayMap.<Campaign.XtkSchemaNode>}
         */
        this.children = new ArrayMap();

        /**
         * Count the children of a node
         * @type {number}
         */
        this.childrenCount = 0;

        /**
         * Get the default value of a node
         * @type {string}
         */
        this.default = EntityAccessor.getAttributeAsString(xml, "default");

        /**
         * Get the default translation for the default value of a node
         * @type {string}
         */
        this.translatedDefault = EntityAccessor.getAttributeAsString(xml, "translatedDefault");

        /**
         * Indicates if the node is the root node, i.e. the first child node of the schema, whose name is the same as the schema name
         * @type {boolean}
         */
        this.isRoot = this.parent && !this.parent.parent && this.parent.name == this.name;

        /**
         * Schema root elements may have a list of keys. This is a dictionary whose names are the key names and values the keys
         * @type {ArrayNode<Campaign.XtkSchemaKey>}
         */
        this.keys = new ArrayMap();

        /**
         * The full path of the node
         * @type {string}
         */
        this.nodePath = this._getNodePath(true)._path;

        this._buildLocalizationIds();

        /**
         * Element of type "link" has an array of XtkJoin
         * @type {XtkJoin[]}
         */
        this.joins = [];
        for (var child of EntityAccessor.getChildElements(xml, "join")) {
            this.joins.push(new XtkJoin(child));
        }

        /**
         * Returns a boolean which indicates whether the current node is ordinary.
         * @type {boolean}
         */
        this.isAnyType = this.type === "ANY";

        /**
         * Returns a boolean which indicates whether the node is a link.
         * @type {boolean}
         */
        this.isLink = this.type === "link";

        /**
         * Returns a boolean which indicates whether the value of the current node is linked to an enumeration.
         * @type {boolean}
         */
        this.hasEnumeration = this.enum !== "";

        /**
         * Returns a boolean which indicates whether the current node is linked to an SQL table.
         * @type {boolean}
         */
        this.hasSQLTable = this.sqlTable !== '';

         /**
          * The SQL name of the field. The property is an empty string if the object isn't an SQL type field.
          * @type {string}
          */
        this.SQLName = EntityAccessor.getAttributeAsString(xml, "sqlname");

         /**
          * The SQL name of the table. The property is an empty string if the object isn't the main element or if schema mapping isn't of SQL type.
          * @type {string}
          */
        this.SQLTable = EntityAccessor.getAttributeAsString(xml, "sqltable");

        /**
         * Returns a boolean indicating whether the table is a temporary table. The table will not be created during database creation.
         * @type {boolean}
         */
        this.isTemporaryTable = EntityAccessor.getAttributeAsBoolean(xml, "temporaryTable");

        /**
         * Returns a boolean which indicates whether the current node is a logical sub-division of the schema.
         * @type {boolean}
         */
        // An element has no real value if its type is empty
        this.isElementOnly = this.type === "";

        /**
         * Returns a boolean. If the value added is vrai, during record deduplication, the default value (defined in defaultValue) is automatically reapplied during recording.
         * @type {boolean}
         */
        this.isDefaultOnDuplicate = EntityAccessor.getAttributeAsBoolean(xml, "defOnDuplicate");

        /**
         * True if the node is a link and if the join is external.
         * @type {boolean}
         */
        this.isExternalJoin = EntityAccessor.getAttributeAsBoolean(xml, "externalJoin");

        /**
         * Returns a boolean which indicates whether the current node is mapped by a Memo.
         * @type {boolean}
         */
        this.isMemo = this.type === "memo" || this.type === "CDATA";

        /**
         * Returns a boolean which indicates whether the current node is mapped by a MemoData.
         * @type {boolean}
         */
        this.isMemoData = this.isMemo && this.name === 'data';

        /**
         * Returns a boolean which indicates whether the current node is a BLOB.
         * @type {boolean}
         */
        this.isBlob = this.type === "blob";

        /**
         * Returns a boolean which indicates whether the current node is mapped from CDATA type XML.
         * @type {boolean}
         */
        this.isCDATA = this.type === "CDATA";

        const notNull = EntityAccessor.getAttributeAsString(xml, "notNull");
        const sqlDefault = EntityAccessor.getAttributeAsString(xml, "sqlDefault");
        const notNullOverriden = notNull || sqlDefault === "NULL";
        /**
         * Returns a boolean which indicates whether or not the current node can take the null value into account.
         * @type {boolean}
         */
        this.isNotNull = notNullOverriden ? XtkCaster.asBoolean(notNull) : this.type === "int64" || this.type === "short" ||
            this.type === "long" || this.type === "byte" || this.type === "float" || this.type === "double" ||
            this.type === "money" || this.type === "percent" || this.type === "time" || this.type === "boolean";

        /**
         * Returns a boolean which indicates whether or not the value of the current node is mandatory.
         * @type {boolean}
         */
        this.isRequired = EntityAccessor.getAttributeAsBoolean(xml, "required");

        /**
         * Returns a boolean which indicates whether the current node is mapped in SQL.
         * @type {boolean}
         */
        this.isSQL = !!this.SQLName || !!this.SQLTable || (this.isLink && this.schema.mappingType === 'sql' && !this.isMappedAsXML);

         /**
          * The SQL name of the field. The property is an empty string if the object isn't an SQL type field.
          * @type {string}
          */
        this.PKSequence = EntityAccessor.getAttributeAsString(xml, "pkSequence");

         /**
          * Name of the reverse link in the target schema
          * @type {string}
          */
        this.revLink = EntityAccessor.getAttributeAsString(xml, "revLink");

        /**
         * Returns a boolean which indicates whether the value of the current node is the result of a calculation.
         * @type {boolean}
         */
        this.isCalculated = false;

        /**
          * Expression associated with the node
          * @type {string}
          */
        this.expr = EntityAccessor.getAttributeAsString(xml, "expr");
        if (this.expr) this.isCalculated = true;

        /**
         * Returns a boolean which indicates whether the value of the current node is incremented automatically.
         * @type {boolean}
         */
        this.isAutoIncrement = EntityAccessor.getAttributeAsBoolean(xml, "autoIncrement");

        /**
         * Returns a boolean which indicates whether the current node is a primary key.
         * @type {boolean}
         */
        this.isAutoPK = EntityAccessor.getAttributeAsBoolean(xml, "autopk");

        /**
         * Returns a boolean which indicates whether the current node is an automatic UUID
         * @type {boolean}
         */
        this.isAutoUUID = EntityAccessor.getAttributeAsBoolean(xml, "autouuid");

        /**
         * Returns a boolean which indicates whether the schema is a staging schema
         * @type {boolean}
         */
        this.isAutoStg = EntityAccessor.getAttributeAsBoolean(xml, "autoStg");

        /**
         * Returns a string that gives the package status.
         * @type {"never" | "always" | "default" | "preCreate"}
         */
        this.packageStatusString = EntityAccessor.getAttributeAsString(xml, "pkgStatus");
        
        /**
         * Returns a number that gives the package status.
         * @type {0 | 1 | 2 | 3}
         */
        this.packageStatus = PACKAGE_STATUS[this.packageStatusString];

        /**
         * Returns a string (a schema id) which indicates the custom/extended entity, attribute belongs to.
         */
        this.belongsTo = EntityAccessor.getAttributeAsString(xml, "belongsTo");

         // Children (elements and attributes)
        const childNodes = [];
        for (const child of EntityAccessor.getChildElements(xml)) {
            if (child.tagName === "attribute") {
                const node = new XtkSchemaNode();
                node.init(schema, child, this, true);
                childNodes.push(node);
            }
            if (child.tagName === "element") {
                const node = new XtkSchemaNode();
                node.init(schema, child, this, false);
                childNodes.push(node);    
            }
            if (child.tagName === "compute-string") {
                this.expr = EntityAccessor.getAttributeAsString(child, "expr");
                this.isCalculated = false;
            }
            if (child.tagName === "default" || child.tagName === "translatedDefault") {
                if(this.unbound) {
                    // Default value for a collection of elements
                    const xml = DomUtil.parse(`<xml>${child.textContent}</xml>`);
                    const json = DomUtil.toJSON(xml);
                    if(child.tagName === "translatedDefault") {
                        this.translatedDefault = XtkCaster.asArray(json[this.name]);
                    } else {
                        this.default = XtkCaster.asArray(json[this.name]);
                    }
                } else {
                    if(child.tagName === "translatedDefault") {
                        this.translatedDefault = child.textContent;
                    } else {
                        this.default = child.textContent;
                    }
                }
            }
        }
        for (const childNode of childNodes) {
            this.children._push(childNode.name, childNode);
            this.childrenCount = this.childrenCount + 1;
        }

        // Keys (after elements and attributes have been found)
        for (const child of EntityAccessor.getChildElements(xml, "key")) {
            const key = new XtkSchemaKey(schema, child, this);
            this.keys._push(key.name, key);
        }

        // Propagate implicit values
        // Name -> Label -> Desc -> HelpText
        propagateImplicitValues(this);
    }

    /* create two ids that are identifying in an unique way the node label and 
     * the node description 
     * examples:
     * nms__recipient__e____recipient__emailFormat__@desc
     * nms__recipient__e____recipient__mobilePhone__@label 
     * */
    _buildLocalizationIds() {
        if (!this.parent) {
          this._localizationId = this.schema.id.replace(":", "__");
        } else {
          this._localizationId = this.parent._localizationId;
        }

        if (this.parent) {
          // Separate each element of the path with a double _
          if (this.isAttribute) {
            this._localizationId = this._localizationId + "__" + this.name.replace('@', '');
          } else {
            // node is not an attribute so it is an element add "e____"
            this._localizationId = this._localizationId + "__e____" + this.name;
          }
        }
        if (this.label) {
          this.labelLocalizationId = this._localizationId + "__@label";
        }
        if (this.description) {
          this.descriptionLocalizationId = this._localizationId + "__@desc";
        }
        if (!this.parent && this.labelSingular) {
          this.labelSingularLocalizationId = this._localizationId + "__@labelSingular";
        }
    }

    /**
     * Indicates whether the current node has an unlimited number of children of the same type.
     *
     * @returns {boolean} a boolean indicating whether the node contains a child with the given name
     */
    isUnbound() {
        return this.unbound;
    }

    /**
     * Computes the path of a node
     * 
     * @private
     * @param {boolean} absolute indicates whether to compute an absolute path or a relative path (default)
     * @returns {string} the node path
     */
    _getNodePath(absolute) {
        if (absolute === undefined) absolute = true;
        var path = !this.parent ? this.name : "";
        var schemaName = this.schema.name;
        var node = this;
        while (node && node.parent) {
            if (path != "") path = `/${path}`;
            if (node.parent.parent || node.name != schemaName)
                path = `${node.name}${path}`;
            node = node.parent;
        }
        if (absolute) {
            if (path == "") path = "/";
            else if (!path.startsWith("/")) path = `/${path}`;
        }
        else {
            if (path.startsWith("/")) path = path.substring(1);
        }
        return new XPath(path);
    }

    /**
     * Find the target of a ref node.
     * @returns {Promise<Campaign.XtkNode>} the target node, or undefined if not found
     */
    async refTarget() {
        if (!this.ref) return;
        const index = this.ref.lastIndexOf(':');
        if (index !== -1) {
            // find the associated schame
            const refSchemaId = this.ref.substring(0, index);
            if (refSchemaId.indexOf(':') === -1)
                throw Error(`Cannot find ref target '${this.ref}' from node '${this.nodePath}' of schema '${this.schema.id}': ref value is not correct (expeted <schemaId>:<path>)`);
            const refPath = this.ref.substring(index + 1);
            // inside current schema ?
            if (refSchemaId === this.schema.id)
                return this.schema.findNode(refPath);
            const refSchema = await this.schema._application.getSchema(refSchemaId);
            if (!refSchema) return;
            return refSchema.findNode(refPath);
        }
        else {
            // ref is in the current schema
            return this.schema.findNode(this.ref);
        }
    }

    /**
     * Find the target of a link node.
     * @returns {Promise<Campaign.XtkNode>} the target node, or undefined if not found
     */
     async linkTarget() {
        if (this.type !== "link") return this.schema.root;
        let schemaId = this.target;
        let xpath = "";
        if (this.target.indexOf(',') !== -1)
            throw new Error(`Cannot find target of link '${this.target}': target has multiple schemas`);
        const index = this.target.indexOf('/');
        if (index !== -1) {
            xpath = this.target.substring(index + 1);
            schemaId = this.target.substring(0, index);
            xpath = this.target.substring(index + 1);
        }
        if (schemaId.indexOf(':') === -1)
            throw new Error(`Cannot find target of link '${this.target}': target is not a valid link target (missing schema id)`);
        const schema = await this.schema._application.getSchema(schemaId);
        if (!schema) return;
        const root = schema.root;
        if (!root) return;
        if (!xpath) return root;
        return await root.findNode(xpath);
    }

    /**
     * Returns an instance of XtkSchemaNode or null if the node doesn't exist. In version 1.1.0 and above, this function is
     * asynchronous (returns a Promise)
     *
     * @param {XML.XPath|string} path XPath represents the name of the node to be searched
     * @returns {Promise<XtkSchemaNode>} Returns a XtkSchemaNode instance if the node can be found
    */
     async findNode(path) {
        if (typeof path == "string") path = new XPath(path);

        // Find the starting node
        var node = this;
        if (path.isEmpty() || path.isAbsolute()) {
            node = this.schema.root;
            if (!node) return;
            path = path.getRelativePath();
        }

        // Special case for current path "."
        if (path.isSelf()) return this;

        const elements = path.getElements();
        while (node && elements.length > 0) {
            const element = elements.shift();
            var name = element.asString();

            // TODO: if the path is a collection path, ignore the collection index

            // handle ref elements (consider the ref target instead)
            if (node.ref) node = await node.refTarget();
            if (!node) break;

            if (node.type === "link") node = await node.linkTarget();
            if (!node) break;

            // Don't continue for any type
            // kludge to accept immediate child of an ANY type node (cas in packages)
            if (node.type === 'ANY') return this.children[name];

            var childNode = null;
            if (element.isSelf()) childNode = node;
            else if (element.isParent()) childNode = node.parent;
            else childNode = await node.children[name];
            node = childNode;
        }
        return node;
    }

    /**
     * Internal recursive function used to create a multi-line debug string representing the schema
     * 
     * @private
     * @param {string} indent indentation string, will be "" for the first, level, "   " for the next level, etc.
     * @returns {string} a multi-line string representing the schema definition in a human readable form for troubleshooting purposes
     */
    toString(indent) {
        indent = indent || "";
        var s = `${indent}${this.label} (${this.name})\n`;
        for (var child of this.children) {
            s = s + child.toString(`    ${indent}`);
        }
        return s;
    }

    /**
     * Return the XtkSchemaNodes making up the join of a link-type node
     * @returns {Promise<Array>} returns an array of joins. Each join is an element having a source and destination attributes, whose value is the corresponding XtkSchemaNode
     */
    async joinNodes() {
        if (!this.isLink) return;
        const joinParts = [];
        for (const join of this.joins) {
            const source = await this.parent.findNode(join.src);
            let destination = await this.linkTarget();
            if (destination) 
                destination = await destination.findNode(join.dst);
            if (source && destination)
                joinParts.push({
                    source: source,
                    destination: destination
                });
        }
        return joinParts;
    }

    /**
     * Returns the reverse link node of a link-type node
     * @returns {Promise<Campaign.XtkSchemaNode>}
     */
    async reverseLink() {
        if (!this.isLink) return;
        const target = await this.linkTarget();
        if (!target) return;
        const revLink = await target.findNode(this.revLink);
        return revLink;
    }

    /**
     * Returns the compute string of a node. As the node can be a link or a reference, this function is asynchronous
     * @returns {Promise<string>}
     */
     async computeString() {
        if (this.expr) return this.expr;
         // if we are a ref: ask the target of the ref
         if (this.ref) {
            const refTarget = await this.refTarget();
            if (!refTarget) return "";
            return await refTarget.computeString();
        }
        // No compute-string found: generate a default one (first key field)
        if (this.keys && this.keys.length > 0) {
            const key = this.keys[0];
            if (key && key.fields && key.fields.length > 0 && key.fields[0])
                return this.schema._application.client.sdk.expandXPath(key.fields[0].nodePath);
        }
        return "";
    }

    /**
     * Returns an Enumeration object which is the enumeration linked to the current node or null if there is no enumeration.
     * @param {string} an optional enumeration name. If none is specified, the node `enum` property will be used
     * @returns Promise<Campaign.XtkEnumeration>
     */
    async enumeration(optionalName) {
        const name = optionalName || this.enum;
        if (!name) return;
        const enumaration = await this.schema._application.getSysEnum(name, this.schema);
        return enumaration;
    }

    /**
     * Get the first internal key (if there is one)
     * @returns {Campaign.XtkSchemaKey}
     */
    firstInternalKeyDef() {
        return this.keys.find((k) => k.isInternal);
    }
    
    /**
     * Get the first external key (if there is one)
     * @returns {Campaign.XtkSchemaKey}
     */
    firstExternalKeyDef() {
        return this.keys.find((k) => !k.isInternal);
    }
    
    /**
     * Get the first key (internal first)
     * @returns {Campaign.XtkSchemaKey}
     */
    firstKeyDef() {
        let key = this.firstInternalKeyDef();
        if (!key) key = this.firstExternalKeyDef();
        return key;
    }
}

// ========================================================================================
// Enumerations
// ========================================================================================

/**
 * @typedef {('string'|'byte'|'short'|'long'|'boolean')} XtkEnumerationType
 * @memberOf Campaign 
 * 
 * @typedef {('sql'|'textFile'|'xmlFile'|'binaryFile')} XtkSchemaMappingType
 * @memberOf Campaign 
 */


/**
 * A system enumeration value
 * 
 * @private
 * @class
 * @constructor
 * @param {XML.XtkObject} The enumeration value definition
 * @param {Campaign.XtkEnumerationType} baseType the enumeration type (often "string" or "byte")
 * @param {string} parentTranslationId the translation id of the parent node
 * @memberof Campaign
 */
function XtkEnumerationValue(xml, baseType, parentTranslationId) {
    /**
     * The value (unique) name
     * @type {string}
     */
    this.name = EntityAccessor.getAttributeAsString(xml, "name");
    /**
     * A human friendly name describing the enumeration value
     * @type {string}
     */
    this.label = EntityAccessor.getAttributeAsString(xml, "label");
    /**
     * Unique identifier for the translation of the label
     * */
    this.labelLocalizationId = parentTranslationId + '__' + this.name + '__@label';
    /**
     * Unique identifier for the tran,slation of the description of the label
     * */
    this.descriptionLocalizationId = parentTranslationId + '__' + this.name + '__@desc';
    /**
     * A human friendly long description of the value
     * @type {string}
     */
     this.description = EntityAccessor.getAttributeAsString(xml, "desc");
     /**
     * The value image (if any) or an empty string
     * @type {string}
     */
    this.image = EntityAccessor.getAttributeAsString(xml, "img");
    /**
     * The value "enabledIf" expression, or an empty string
     * @type {string}
     */
    this.enabledIf = EntityAccessor.getAttributeAsString(xml, "enabledIf");
    /**
     * The value "applicableIf" expression, or an empty string
     * @type {string}
     */
    this.applicableIf = EntityAccessor.getAttributeAsString(xml, "applicableIf");
    let stringValue = EntityAccessor.getAttributeAsString(xml, "value");
    if (stringValue == "" && XtkCaster.isNumericType(baseType)) {
        // Some enumerations (ex: xtk:dataTransfer:decimalCount) are of numeric type but do
        // not have a "value" defined. In this case, we try to cas the name as the value
        stringValue = this.name;
    }
    /**
     * The enumeration value, casted according to the enumeration type
     * @type {*}
     */
    this.value = XtkCaster.as(stringValue, baseType);

    propagateImplicitValues(this, true);
}

/**
 * A system enumeration 
 * 
 * @private
 * @class
 * @constructor
 * @param {XML.XtkObject} xml the enumeration definition
 * @memberof Campaign
 */
class XtkEnumeration {
    constructor(schemaId, xml) {
        /**
         * The system enumeration name, fully qualified, i.e. prefixed with the schema id
         * @type {string}
         */
        this.name = EntityAccessor.getAttributeAsString(xml, "name");

        /**
         * A human friendly name for the system enumeration
         * @type {string}
         */
        this.label = EntityAccessor.getAttributeAsString(xml, "label");

        /**
         * A human friendly long description of the enumeration
         * @type {string}
         */
        this.description = EntityAccessor.getAttributeAsString(xml, "desc");

        /**
         * The type of the enumeration, usually "string" or "byte"
         * @type {Campaign.XtkEnumerationType}
         */
        this.baseType = EntityAccessor.getAttributeAsString(xml, "basetype");

        /**
         * The default value of the enumeration
         * @type {Campaign.XtkEnumerationValue}
         */
        this.default = null;

        /**
         * Indicates if the enumeration has an image, i.e. if any of its values has an image
         * @type {boolean}
         */
        this.hasImage = false;

        /**
         * The enumerations values 
         * @type {Utils.ArrayMap<Campaign.XtkEnumerationValue>}
         */
        this.values = new ArrayMap();

        var defaultValue = EntityAccessor.getAttributeAsString(xml, "default");
        this._localizationId = `${schemaId}__${this.name}`.replace(':','__');

         // Determine if the enumeration can support both access by name and by index.
         // Some enumerations, such as xtk:dataTransfer:decimalCount are ambiguous since
         // they have names which are string reprensentation of their values (ex: name="0").
         // In this case enumValue[0] may mean either the first enumeration value (index 0)
         // or the enumeration value with value "0" which happens to be the second
        let supportsIndexing = true;
        const values = [];
        for (var child of EntityAccessor.getChildElements(xml, "value")) {
            const e = new XtkEnumerationValue(child, this.baseType, this._localizationId);
            values.push(e);
            const numericName = +e.name;
            if (numericName === numericName) {
                // Name is a number
                supportsIndexing = false;
            }
        }

        for (const e of values) {
            this.values._push(e.name, e, !supportsIndexing);
            if (e.image != "") this.hasImage = true;
            const stringValue = e.name;
            if (defaultValue == stringValue)
                this.default = e;
        }

        this.labelLocalizationId = this._localizationId + "__@label";
        this.descriptionLocalizationId = this._localizationId + "__@desc";
        propagateImplicitValues(this, true);

        /**
         * The system enumeration name, without the schema id prefix
         * @type {string}
         */
        this.shortName = this.name;
        this.name = `${schemaId}:${this.shortName}`;
    }
}

// ========================================================================================
// Schemas
// ========================================================================================

/**
 * A schema
 * 
 * @private
 * @class
 * @constructor
 * @param {Campaign.Application|undefined} the application object which will be used to follow links and references
 * @augments Campaign.XtkSchemaNode
 * @param {XML.XtkObject} xml the schema definition
 * @memberof Campaign
 */
class XtkSchema extends XtkSchemaNode {

    constructor(application, xml) {
        super();
        this._application = application;

        /**
         * The namespace of the schema
         * @type {string}
         */
        this.namespace = EntityAccessor.getAttributeAsString(xml, "namespace");

        /**
         * The schema id, in the form "namespace:name"
         * @type {string}
         */
        this.name = EntityAccessor.getAttributeAsString(xml, "name");
        this.id = `${this.namespace}:${this.name}`;

        /**
         * Indicates whether the schema is a library schema or not
         * @type {boolean}
         */
        this.isLibrary = EntityAccessor.getAttributeAsBoolean(xml, "library");

        /**
         * A human name for the schema, in singular
         * @type {string}
         */
        this.labelSingular = EntityAccessor.getAttributeAsString(xml, "labelSingular");
        /**
         * The schema mappgin type, following the xtk:srcSchema:mappingType enumeration
         * @type {Campaign.XtkSchemaMappingType}
         */
        this.mappingType = EntityAccessor.getAttributeAsString(xml, "mappingType");

        /**
         * The MD5 checksum of the schema in the form of a hexadecimal string
         * @type {string}
         */
        this.md5 = EntityAccessor.getAttributeAsString(xml, "md5");

        /**
         * The schema definition
         * @private
         * @type {XML.XtkObject}
         */
        this.xml = xml;

        this.init(this, xml);

        /**
         * The schema root node, if it has one, i.e. the first child whose name matches the schema name
         * @type {Campaign.XtkSchemaNode}
         */
        this.root = this.children[this.name];
        
        /**
         * A user desciption of the node, in the form "label (name)"
         * @type {string}
         */
         this.userDescription = (this.label == this.name) ? this.name : `${this.label} (${this.name})`;

        /**
         * Enumerations in this schema, as a dictionary whose keys are enumeration names and values are the
         * corresponding enumeration definitions
         * @type {Utils.ArrayMap<Campaign.XtkEnumeration>}
         */
         this.enumerations = new ArrayMap();
         for (var child of EntityAccessor.getChildElements(xml, "enumeration")) {
             const e = new XtkEnumeration(this.id, child);
             if (this.enumerations.get(e.shortName) === undefined) {
                 this.enumerations._push(e.shortName, e);
             }
         }
     }

    /**
     * Creates a multi-line debug string representing the schema
     * 
     * @returns {string} a multi-line string representing the schema definition in a human readable form for troubleshooting purposes
     */
    toString() {
        var s =  `${this.userDescription}\n`;
        for (var child of this.children) {
            s = s + child.toString("    - ");
        }
        return s;
    }
}



// ========================================================================================
// Current Login
// ========================================================================================

/**
 * Represents the currently logged operator. Do not create directly, this is available
 * as the sdk.application.operator variable
 * 
 * @private
 * @class
 * @constructor
 * @param {XML.XtkObject} userInfo the user info object as returned from the xtk:session#Logon call
 * @memberof Campaign
 */
class CurrentLogin {

    constructor(userInfo) {
        /**
         * The operator login name
         * @type {string}
         */
        this.login = EntityAccessor.getAttributeAsString(userInfo, "login");

        /**
         * The operator login id
         * @type {number}
         */
        this.id = EntityAccessor.getAttributeAsLong(userInfo, "loginId");
        
        /**
         * A human friendly string naming the operator (compute string)
         * @type {string}
         */
        this.computeString = EntityAccessor.getAttributeAsString(userInfo, "loginCS");
        
        /**
         * The operator timezone
         * @type {string}
         */
        this.timezone = EntityAccessor.getAttributeAsString(userInfo, "timezone");
       
        /**
         * The instance locale
         * @type { string }
         */
        this.instanceLocale = EntityAccessor.getAttributeAsString(userInfo, "instanceLocale");

        /**
         * The llist of operator rights
         * @type {string[]}
         */
        this.rights = [];
        this._rightsSet = {};
        for (var child of EntityAccessor.getChildElements(userInfo, "login-right")) {
            const right = EntityAccessor.getAttributeAsString(child, "right");
        this.rights.push(right);
        this._rightsSet[right] = true;
        }
    }

    /**
     * Tests if the operator has a given named right
     * 
     * @param {string} name the access right name
     * @returns {boolean} a boolean indicating whether the operator has the given right or not
     */
    hasRight(name) {
        return !!this._rightsSet[name];
    }

}

/**
 * Creates a current login object for testing purposes
 * 
 * @private
 * @param {XML.XtkObject} userInfo the user info object as returned from the xtk:session#Logon call 
 * @returns the CurrentLogin object corresponding to the passed object
 * @memberof Campaign
 */
function newCurrentLogin(userInfo) {
    return new CurrentLogin(userInfo);
}

// ========================================================================================
// Application
// ========================================================================================

/**
 * @class
 * @constructor
 * @param {Campaign.Client} client The Campaign Client from which this Application object is created
 * @memberof Campaign
 */
class Application {

    /**
     * The Application object provides access to certain properties of the Campaign server.
     * Do not create this object directly, it's automatically created by the Campaign.Client at Logon time
     * @private
     * @param {Campaign.Client} client the Campaign client representing the Campaign instance
     */
    constructor(client) {
        this.client = client;
        this._schemaCache = new SchemaCache(client);
        const info = this.client.getSessionInfo();
        // When using "SessionToken" authentication, there is no actual logon, and therefore
        // no "sessionInfo" object
        if (info) {
            const serverInfo = EntityAccessor.getElement(info, "serverInfo");
            /**
             * The server build number
             * @type {string}
             */
            this.buildNumber = EntityAccessor.getAttributeAsString(serverInfo, "buildNumber");
            /**
             * The server version, formatted as major.minor.servicePack (ex: 8.2.10)
             * @type {string}
             */
            const majNumber = EntityAccessor.getAttributeAsString(serverInfo, "majNumber");
            const minNumber = EntityAccessor.getAttributeAsString(serverInfo, "minNumber");
            const servicePack = EntityAccessor.getAttributeAsString(serverInfo, "servicePack");
            if (majNumber && minNumber && servicePack)
                this.version = majNumber + "." + minNumber + "." + servicePack;
            /**
             * The Campaign instance name
             * @type {string}
             */
            this.instanceName = EntityAccessor.getAttributeAsString(serverInfo, "instanceName");
            const userInfo = EntityAccessor.getElement(info, "userInfo");
            /**
             * The logged operator
             * @type {Campaign.CurrentLogin}
             */
            this.operator = new CurrentLogin(userInfo);
            /**
             * The list of installed packages
             * @type {string[]}
             */
            this.packages = [];
            for (var p of EntityAccessor.getChildElements(userInfo, "installed-package")) {
            this.packages.push(`${EntityAccessor.getAttributeAsString(p, "namespace")}:${EntityAccessor.getAttributeAsString(p, "name")}`);
            }
        }
    }

    _registerCacheChangeListener() {
        this.client._registerCacheChangeListener(this._schemaCache);
    }

    _unregisterCacheChangeListener() {
        this.client._unregisterCacheChangeListener(this._schemaCache);
    }
    /**
     * Get a schema by id. This function returns an XtkSchema object or null if the schema is not found.
     * Using the `XtkSchema` API makes it easier to navigate schemas than using a plain XML or JSON object
     * 
     * @param {string} schemaId 
     * @returns {Campaign.XtkSchema} the schema, or null if the schema was not found
     */
     async getSchema(schemaId) {
        return this._schemaCache.getSchema(schemaId);
    }

    // Private function: get a schema without using the SchemaCache
    async _getSchema(schemaId) {
        const xml = await this.client.getSchema(schemaId, "xml");
        if (!xml)
            return null;
        return newSchema(xml, this);
    }

    /**
     * Tests if a package is installed or not
     * 
     * @param {string} name the package name
     * @returns {boolean} a boolean indicating whether the package is installed or not
     */
    hasPackage(name) {
        for (var p of this.packages) {
            if (p == name) return true;
        }
        return false;
    }

    /**
     * Get a system enumeration
     * 
     * @param {string} enumerationName The name of the enumeration, which can be fully qualified (ex: "nms:recipient:gender") or not (ex: "gender")
     * @param {string} schemaOrSchemaId An optional schema id. If the enumerationName is not qualified, the search for the enumeration will be done in this schema
     * @returns {XtkEnumeration} the enumeration
     */
    async getSysEnum(enumerationName, schemaOrSchemaId) {
        const index = enumerationName.lastIndexOf(':');
        if (index === -1) {
            let schema = schemaOrSchemaId;
            if (schema && typeof schema === "string")
                schema = await this.getSchema(schema);
            // unqualified enumeration name
            if (!schema) return;
            return schema.enumerations[enumerationName];
        }
        // qualified enumeration name
        const schemaId = enumerationName.substring(0, index);
        if (schemaId.indexOf(':') === -1)
            throw Error(`Invalid enumeration name '${enumerationName}': expecting {name} or {schemaId}:{name}`);
        let schema = await this.getSchema(schemaId);
        if (!schema) return;
        return schema.enumerations[enumerationName.substring(index + 1)];
    }
}



// Public exports
exports.Application = Application;

// For tests
exports.newSchema = newSchema;
exports.newCurrentLogin = newCurrentLogin;
exports.SchemaCache = SchemaCache;
})();
