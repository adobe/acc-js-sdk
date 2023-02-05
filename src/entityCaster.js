/*
Copyright 2022 Adobe. All rights reserved.
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
   * Helper class to cast entities according to schema definitions
   * 
   *********************************************************************************/
  const { CampaignException } = require("./campaign");
  const { XtkCaster } = require("./xtkCaster");
  const { newSchema } = require("./application");
  const { XPath, DomUtil } = require("./domUtil");

  // ========================================================================================
  // Casting options
  // ========================================================================================

  /**
   * Options to configure a EntityCaster and QueryDefSchemaInferer objects
   * 
   * @typedef {Object} EntityCasterOptions
   * @property {boolean} enabled - If casting is enabled or not
   * @property {boolean} addEmptyArrays - if set, will add empty arrays for all unbound collections found in the casted object
   * @property {function} exprTypeInferer - a callback function to infer the type of a xtk epression
   * @memberOf Campaign
   */


  // ========================================================================================
  // the EntityCaster casts object according to a schema
  // ========================================================================================

  
  /**
   * @class
   * @constructor
   * @memberof Campaign
   */
  class EntityCaster {
    /**
     * An EntityCaster casts JSON objects (SimpleJson) generated by XML conversion according
     * to a schema. The schema may be partial, i.e. attributes of the object which are not in 
     * the schema will be kept unchanged
     * @param {Campaign.Client} client - The Campaign Client which will be used to dynamically load schemas
     * @param {string|Campaign.XtkSchema} schema - the schema id (ex: nms:recipient)
     * @param {Campaing.EntityCasterOptions} options - casting options
     */
    constructor(client, schema, options) {
      this._client = client;
      this._schema = schema;
      this._options = options;
    }

    /**
     * Cast an entitty according to a schema
     * @param {*} entity - the entity (SimpleJson) to be casted
     * @returns {*} entity - the casted entity
     */
    async cast(entity) {
      if (!this._options || !this._options.enabled) return entity;
      var schema = this._schema;
      if (!schema) return entity;

      // We were given a schema id, let's lookup the schema
      if (typeof schema === "string") {
        const schemaId = schema;
        schema = await this._client._getCasterSchema(schema);  // TODO: should use internal flag (3 more occurrences)
        if (!schema) 
          throw CampaignException.UNKNOWN_SHEMA(schemaId);
      }
      
      const result = await this._cast(entity, schema.root);
      if (this._options && this._options.addEmptyArrays)
        await this._addEmptyArrays(entity, schema.root);
      return result;
    }

    /**
     * Transforms an XML entity to a JSON object, using a schema to guide the transformation
     * Attributes or elements outside of the schema will be transformed, assuming the default SimpleJson rules
     */
    async toJSON(xml) {
      if (xml === null || xml === undefined) return xml;
      // If no schema is specified or if otpions says casting is disable, then use
      // the default SimpleJson rules
      var schema = this._schema;
      if (!schema || !this._options || !this._options.enabled) 
        return DomUtil.toJSON(xml, "SimpleJson");

      // We were given a schema id, let's lookup the schema
      if (typeof schema === "string") {
        const schemaId = schema;
        schema = await this._client._getCasterSchema(schema);
        if (!schema) 
          throw CampaignException.UNKNOWN_SHEMA(schemaId);
      }

      if (xml.nodeType == 9)
        xml = xml.documentElement;
      var json = {};
      await this._toJSON(xml, json, schema.root);
      
      if (this._options && this._options.addEmptyArrays)
        await this._addEmptyArrays(json, schema.root);

      return json;
    }

    async _toJSON(xml, json, nodeDef, parentJson, forceTextAs$) {
        // Heuristic to determine if element is an object or an array
        const isCollection = (nodeDef && nodeDef.unbound) || (xml.tagName.length > 11 && xml.tagName.substr(xml.tagName.length-11) == '-collection');
        
        // Figure out which elements are arrays. Keep a count of elements for each tag name.
        // When count >1 we consider this tag name to be an array
        var hasChildElements = false; // Will be set if there is at least one child element
        const countByTag = {};
        var child = xml.firstChild;
        while (child) {
            if (child.nodeType == 1) {
                const childName = child.nodeName;
                if (countByTag[childName] === undefined) countByTag[childName] = 1;
                else countByTag[childName] = countByTag[childName] + 1;
                hasChildElements = true;
            }
            child = child.nextSibling;
        }

        const isXmlAnyLocalizableWithChildren = nodeDef && nodeDef.type === "ANY" && nodeDef.localizable && nodeDef.childrenCount > 0;
        
        child = xml.firstChild;
        while (child && !isXmlAnyLocalizableWithChildren) {
            if (child.nodeType == 1) {
                const childName = child.nodeName;
                var isArray = /*isCollection ||*/ countByTag[childName] > 1;

                const elNodeDef = nodeDef ? nodeDef.children[childName] : undefined;
                if (elNodeDef && elNodeDef.unbound) isArray = true;
                const isCDATA = elNodeDef && elNodeDef.isCDATA;
                const isHTML = elNodeDef && elNodeDef.type === "html";
                const isAnyLocalizable = elNodeDef && elNodeDef.type === "ANY" && elNodeDef.localizable;

                // Does the ANY schema has child attributes (or elements), just like the <static> element in form has
                const isAnyLocalizableWithChildren = isAnyLocalizable && elNodeDef.childrenCount > 0;

                if (isArray && !json[childName]) json[childName] = [];

                // In SimpleJson representation, ensure we have proper transformation
                // of text and CDATA nodes. For instance, the following
                //  <workflow><desc>Hello</desc></workflow>
                // should be transformed into { "$desc": "Hello" }
                // Note that an empty element such as
                //  <workflow><desc></desc></workflow>
                // will be transformed into { "desc": {} }
                // because there is an ambiguity and, unless we have information
                // from the schema, we cannot know if <desc></desc> should be
                // transformed into "$desc": "" or into "desc": {}
                let text = DomUtil._getTextIfTextNode(child);
                if (!isArray && (text !== null || isCDATA || isHTML || isAnyLocalizable) && !isAnyLocalizableWithChildren) {
                    if (elNodeDef && elNodeDef.type)
                        text = XtkCaster.as(text, !isAnyLocalizable ? elNodeDef.type : "string");
                    json[`$${childName}`] = text;
                }
                else {
                    const jsonChild = {};
                    await this._toJSON(child, jsonChild, elNodeDef, json, isArray);
                    if (isArray) 
                        json[childName].push(jsonChild);
                    else
                        json[childName] = jsonChild;
                }
            }
            child = child.nextSibling;
        }

        // Proceed with text nodes in SimpleJson format. 
        if (isXmlAnyLocalizableWithChildren) {
          const text = DomUtil.innerHTML(xml);
          json.$ = text;
        }
        else {
          var text = "";
          child = xml.firstChild;
          while (child) {
              if (child.nodeType === 3) { // text 
                  var nodeText = child.nodeValue;
                  // Whitespace trimming rule: always trim for the root node, and trim for non-root nodes
                  // which actually have children elements
                  // Never trim CDATA nodes (nodeType 4)
                  if (!parentJson || hasChildElements)
                      nodeText = nodeText.trim(); 
                  if (nodeText) text = text + nodeText;
              }    
              else if (child.nodeType === 4) { // CDATA    
                  const cdataText = child.nodeValue;
                  if (cdataText) text = text + cdataText;
              }    
              child = child.nextSibling;
          }
          if (text) {
              json.$ = text;
          }
        }

        // Finally proceed with attributes. They are processed last so that we get a chance to prefix
        // the attribute name with "@" in SimpleJson format if there's already an element with the
        // same name
        if (xml.hasAttributes()) {
            const attributes = xml.attributes;
            for (var i=0; i<attributes.length; i++) {
                const att = attributes[i];
                var attName = att.name;
                var attValue = att.value;

                var prependAtChar = json[attName] !== undefined; // There's already an element with the same name as the attribute
                const attNodeDef = nodeDef ? nodeDef.children[`@${attName}`] : undefined;
                if (attNodeDef) {
                  attValue = XtkCaster.as(attValue, attNodeDef.type);
                  // preppend @ char if element and att exist with same name in schema
                  prependAtChar = prependAtChar || nodeDef.children[attName];
                }

                if (prependAtChar)
                    attName = "@" + attName;
                json[attName] = attValue;
            }
        }
    }

    // Adds empty array after an entity has been casted
    // @param {*} entity - the casted entity to which to add empty arrays
    // @param Campaign.{XtkSchemaNode} root - the schema root corresponding to the entity
    async _addEmptyArrays(entity, root) {
      if( !entity) return;
      for (const schemaNode of root.children) { 
        const value = entity[schemaNode.name];
        if (schemaNode.isElementOnly && schemaNode.unbound && !value) {
            entity[schemaNode.name] = [];
        }
        else if (value && schemaNode.isElementOnly) {
          this._addEmptyArrays(value, schemaNode);
        }
      }
    }

    // Get a schema node
    // @param {Campaign.XtkSchemaNode} parent - the schema node to search from
    // @param {string} key - the json property key (in SimpleJson format), i.e. the element or attribute name
    async _getSchemaNode(parent, key) {
      const elementNode = await parent.findNode(key);
      if (elementNode) return elementNode;
      const attributeNode = await parent.findNode(`@${key}`);
      return attributeNode;
    }

    // Recursively casts an object to a schema
    // @param {*} entity - the casted entity to cast (transformation will be done in place)
    // @param Campaign.{XtkSchemaNode} root - the schema root corresponding to the entity
    async _cast(entity, root) {
      if( !entity) return;

      // Iterates over JSON properties
      const keys = Object.keys(entity);
      for (var i=0; i<keys.length; i++) {
        const key = keys[i];
        // Lookup corresponding schema node. If none is found, continue processing without
        // changing this property value
        const schemaNode = await this._getSchemaNode(root, key);
        if (schemaNode) {
          var value = entity[key];
          if (schemaNode.isAttribute) {
            // For attributes, we simply cast to the attribute type
            value = XtkCaster.as(value, schemaNode.type);
          }
          else {
            // For links, follow the link and continue the conversion with new root node
            if (schemaNode.isLink) {
              const targetRoot = await schemaNode.linkTarget();
              if (targetRoot) {
                value = await this._cast(value, targetRoot);
              }
            }
            // For structure node, recursively casts node
            else if (schemaNode.isElementOnly) {
              if (schemaNode.unbound) {
                value = XtkCaster.asArray(value);
                for (var i=0; i<value.length; i++) {
                  var item = value[i];
                  item = await this._cast(item, schemaNode);
                  value[i] = item;             
                }
              }
              else {
                value = await this._cast(value, schemaNode);
              }
            }
            // And for text nodes, convert to string
            else {
              value = XtkCaster.asString(value);
            }
          }
          entity[key] = value;
        }
      }
      return entity;
    }
  }



  // ========================================================================================
  // A QueryDefSchemaInferer will infer a schema from a querydef
  // ========================================================================================

  /**
   * @typedef {Object} XtkExpressionType
   * @property {string} type - the xtk type
   * @memberOf Campaign
   */

  /**
   * @class
   * @constructor
   * @memberof Campaign
   */
  class QueryDefSchemaInferer {
    /**
     * A QueryDefSchemaInferer will infer a schema from a querydef
     * @param {Campaign.Client} client - The Campaign Client which will be used to dynamically load schemas
     * @param {*} queryDef - A QueryDef object (in SimpleJson format)
     * @param {Campaing.EntityCasterOptions} options - schema inference options
     */
    constructor(client, queryDef, options) {
      this._client = client;
      this._queryDef = queryDef;
      this._options = options;
    }

    // Infers the type of an expression
    // @param {Campaign.XtkSchemaNode} root - the schema root node to use to interpret the expression xpaths
    // @param {string} expr - the XTK expression
    // @return {Promise<[Campaign.XtkSchemaNode, XtkExpressionType]>} an optional XtkSchemaNode and the expression type
    //
    // If the expression type could not be determined, the function should return undefined as the second
    // element of the array. 
    // The first element of the returned array is used when the queryDef has subnodes. Subnodes expressions 
    // must be evaluated in the context of their parent node. For instance this expression
    //      <node expr="struct"><node expr="@count"/></node>
    // The @count attribute must be interpreted in the "struct" node. For this to work, _inferExprNode
    // must return an XtkSchemaNode when processing the "struct" node
    async _inferExprNode(root, startPath, expr, allowCustomInferrer) {
      if (!expr) return [undefined, undefined];

      // Compute string
      if (expr === "[.]")
        return [ undefined, { type: "string" } ];

      // Custom expression type inferer
      if (allowCustomInferrer && this._options && this._options.exprTypeInferer) {
        const inferedNode = await this._options.exprTypeInferer(root, startPath, expr);
        return [ undefined, inferedNode ];
      }

      // If the expression is xpath then look it up
      const node = await root.findNode(startPath + expr);
      if (node) {
        return [ node, { type: node.type } ];
      }
      return [ undefined, undefined ];
    }

    // The casting process uses an intermediate representation (a node tree) before it
    // creates the actual schema. Each node in this hierarchy has a parent property
    // which points to the parent node. It alos has a node poperty which contains a
    // payload about this node, i.e. type information. Not terminal nodes also have
    // a children property which is a map of children, by name (with @ prefix for
    // attributes)
    //
    // @param {*} root - is the parent node in the hierarchy
    // @param {string} alias - is the xpath stirng of the node to create
    // @param {XtkExpressionType} node - is the payload for the node
    // @return {*} the node created
    //
    // The function will create all necessary intermediate nodes in the hierarchy
    // if they do not exist. Later, this hierarchy will be converted to the
    // final schema
    _createNode(root, alias, node) {
      const xpath = new XPath(alias);
      const elements = xpath.getElements();
      var parent = root;
      for (var i = 0; i<elements.length; i++) {
        const e = elements[i];
        const isLast = i === (elements.length - 1);
        if (e.isSelf()) continue;
        if (e.isAttribute()) {
          const newChild = { node: node, parent: parent };
          parent.children[e.name()] = newChild;
          parent = newChild;
          break;
        }
        else {
          var child = parent.children[e.name()];
          if (!child)
            child = parent.children[e.name()] = { children: [], parent: parent };
          if (isLast)
            child.node = node;
          parent = child;
        }
      }
      return parent;
    }

    // Recursively builds a schema from a query node
    // @param {*} targetRoot is the intermediate node to fill up
    // @param {*} node is the query node to process
    // @param {Campaign.XtkSchemaNode} sourceRoot is the start schema node in which to interpret xpaths
    async _buildSchema(targetRoot, node, sourceRoot, startPath) {
      const expr = node.expr;

      // if query node has children query nodes, then te expression of the query node must be a xpath which
      // corresponds to the start node which will be used to evaluate children query nodes
      const allowCustomInferrer = !node.node;

      const [xtkNode, inferedNode] = await this._inferExprNode(sourceRoot, startPath, expr, allowCustomInferrer);
      const alias = node.alias || expr;
      /*const newNode = */this._createNode(targetRoot, alias, inferedNode);
      // Analyze attribute adds 2 schema attributes with -Name and -Label suffixes
      if (node.analyze) {
        this._createNode(targetRoot, `${alias}Name`, { type: "string" });
        this._createNode(targetRoot, `${alias}Label`, { type: "string" });
      }
      // Nested nodes ?
      if (node.node) {
        const children = XtkCaster.asArray(node.node);
        let newStartPath = xtkNode.nodePath.substring(1) + "/"; // remove starting "/" and add ending "/"
        for (const child of children) {
          await this._buildSchema(targetRoot, child, sourceRoot, newStartPath);
        }
      }
    }

    // Converts the intermediate schema representation into an XML schema and then to
    // an actual XtkSchemaNode hierarchy
    // @param {*} root - the root of the intermediate node tree
    // @returns {Promise<XtkSchema>} - the resulting schema
    async _convertToSchema(schemaName, unbound, root) {
      const name = schemaName + (unbound ? "-collection": "");
      const doc = DomUtil.parse(`<schema name="${name}" namespace="temp"></schema>`);
      const eSchema = doc.documentElement;
      const eRoot = doc.createElement("element");
      eRoot.setAttribute("name", `${name}`);
      //eRoot.setAttribute("unbound", unbound ? "true": "false");
      eSchema.appendChild(eRoot);

      var eEntity = eRoot;
      if (unbound) {
        eEntity = doc.createElement("element");
        eEntity.setAttribute("name", schemaName);
        eEntity.setAttribute("unbound", "true");
        eRoot.appendChild(eEntity);
      }

      const recurse = (eRoot, root) => {
        const keys = Object.keys(root.children);
        for (const key of keys) {
          const item = root.children[key];
          if (key[0] === '@') {
            if (item.node) { // only add to schema if we could actually infer the type
              const eAttr = doc.createElement("attribute");
              eAttr.setAttribute("name", key.substring(1));
              eAttr.setAttribute("type", item.node.type);
              eRoot.appendChild(eAttr);
            }
          }
          else {
            const eElem = doc.createElement("element");
            eElem.setAttribute("name", key);
            if( item.node) {
              eElem.setAttribute("type", item.node.type);
            }
            eRoot.appendChild(eElem);
            if (item.children) {
              recurse(eElem, item);
            }
          }
        }
      };
      if (root && root.children) recurse(eEntity, root);

      return new newSchema(eSchema, this._client.application);
    }

    /**
     * Get the schema corresponding to the query
     * @returns {Promise<XtkSchema>} - the resulting schema
     */
    async getSchema() {
      const schema = await this._client._getCasterSchema(this._queryDef.schema);
      if (!schema) 
        throw CampaignException.UNKNOWN_SHEMA(this._queryDef.schema);
      //const entityNode = { children: {}, unbound: this._queryDef.operation === "select" };
      //const schemaName = schema.name;
      const targetRoot = { children: { } };
      if (this._queryDef.select && this._queryDef.select.node) {
        const nodes = XtkCaster.asArray(this._queryDef.select.node);
        for (const node of nodes) {
          await this._buildSchema(targetRoot, node, schema.root, "");
        }
      }
      const result = await this._convertToSchema(schema.name, this._queryDef.operation === "select", targetRoot);
      return result;
    }
  }

  
  exports.EntityCaster = EntityCaster;
  exports.QueryDefSchemaInferer = QueryDefSchemaInferer;
  
})();
  