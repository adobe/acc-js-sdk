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



/**********************************************************************************
 * 
 * Browser-side implementation of jsdom node module. As the DOM is already
 * available in the browser, this is very light weight
 * 
 *********************************************************************************/


 var jsdom = function(text) {
    var parser = new DOMParser();
    var dom = parser.parseFromString(text, "application/xml");
    this.window = {
        document: dom
    }
    this.serialize = function() {
        return new XMLSerializer().serializeToString(dom);
    }
}

exports.JSDOM = jsdom;


