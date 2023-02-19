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
 * Unit tests for the SOAP wrapper
 * 
 *********************************************************************************/

const { SoapMethodCall } = require('../src/soap.js');
const { CampaignException, makeCampaignException } = require('../src/campaign.js');
const { DomUtil } = require('../src/domUtil.js');
const assert = require('assert');
const sdk = require('../src/index.js');

const URL = "https://soap-test/nl/jsp/soaprouter.jsp";

function makeSoapMethodCall(transport, urn, methodName, sessionToken, securityToken, userAgentString, pushDownOptions, extraHttpHeaders) {
    const call = new SoapMethodCall(transport, urn, methodName, sessionToken, securityToken, userAgentString, pushDownOptions, extraHttpHeaders);
    return call;
}

function makeSOAPResponseWithNoBody() {
    const doc = DomUtil.parse(`<?xml version='1.0' encoding='UTF-8'?>
        <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/' xmlns:ns='http://xml.apache.org/xml-soap'>
        </SOAP-ENV:Envelope>`);
    return DomUtil.toXMLString(doc);
}

function makeSOAPResponseWithEmptyBody() {
    const doc = DomUtil.parse(`<?xml version='1.0' encoding='UTF-8'?>
        <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/' xmlns:ns='http://xml.apache.org/xml-soap'>
            <SOAP-ENV:Body>
            </SOAP-ENV:Body>
        </SOAP-ENV:Envelope>`);
    return DomUtil.toXMLString(doc);
}

function makeSOAPResponse(methodName /*, p1, t1, v1, p2, t2, v2... */) {
    const xml = `<?xml version='1.0' encoding='UTF-8'?>
        <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/' xmlns:ns='http://xml.apache.org/xml-soap'>
            <SOAP-ENV:Body>
                <${methodName}Response>
                </${methodName}Response>
            </SOAP-ENV:Body>
        </SOAP-ENV:Envelope>`;
    const doc = DomUtil.parse(xml);
    const root = doc.documentElement;
    const body = DomUtil.getFirstChildElement(root);
    const response = DomUtil.getFirstChildElement(body);
    for (var i=1; i<arguments.length; i+=3) {
        var pname = arguments[i];
        var ptype = arguments[i+1];
        var pvalue = arguments[i+2];
        var pel = doc.createElement(pname);
        if (ptype == "ns:Element" || ptype == "ns:Document") {
            if (pvalue && pvalue !== "") {
                const parsed = DomUtil.parse(pvalue).documentElement;
                const child = doc.importNode(parsed, true);
                pel.appendChild(child);
            }
        }
        else {
            pel.textContent = pvalue;
        }
        pel.setAttribute("xsi:type", ptype);
        response.appendChild(pel);
    }
    return DomUtil.toXMLString(doc);
}

function makeSOAPResponseWithExtraElements(methodName) {
    const xml = `<?xml version='1.0' encoding='UTF-8'?>
        <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/' xmlns:ns='http://xml.apache.org/xml-soap'>
            <SOAP-ENV:Body>
                <extra/>
                <extra/>
                <${methodName}Response>
                </${methodName}Response>
                <extra/>
            </SOAP-ENV:Body>
        </SOAP-ENV:Envelope>`;
    return xml;
}

function makeSOAPFault(faultcode, faultstring, detail) {
    const doc = DomUtil.parse(`<?xml version='1.0' encoding='UTF-8'?>
        <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/' xmlns:ns='http://xml.apache.org/xml-soap'>
            <SOAP-ENV:Body>
                <SOAP-ENV:Fault>
                <faultcode>${faultcode}</faultcode>
                <faultstring>${faultstring}</faultstring>
                <detail>${detail}</detail>
                </SOAP-ENV:Fault>
            </SOAP-ENV:Body>
        </SOAP-ENV:Envelope>`);
    return DomUtil.toXMLString(doc);
}
function makeSOAPFaultNoDetail(faultcode, faultstring) {
    const doc = DomUtil.parse(`<?xml version='1.0' encoding='UTF-8'?>
        <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/' xmlns:ns='http://xml.apache.org/xml-soap'>
            <SOAP-ENV:Body>
                <SOAP-ENV:Fault>
                <faultcode>${faultcode}</faultcode>
                <faultstring>${faultstring}</faultstring>
                </SOAP-ENV:Fault>
            </SOAP-ENV:Body>
        </SOAP-ENV:Envelope>`);
    return DomUtil.toXMLString(doc);
}

describe('SOAP', function() {

    describe('Request builder', function() {

        // Asserts that:
        // - a child element with expected tag name exists
        // - this child element has the exepected text content (optional. only if "text" is defined)
        // - this child element has expected attributes with expected values
        function hasChildElement(element, tagName, text /*, att, value, att, value, ... */) {
            const child = DomUtil.findElement(element, tagName);
            assert.notEqual(child, null, `Should find child ${tagName}`);
            if (text !== undefined) {
                const actualText = child.textContent;
                assert.equal(actualText, text, `Element ${tagName} should have expected text value ${text}`);
            }
            for (var i=3; i<arguments.length; i+=2) {
                const attName = arguments[i];
                const attValue = arguments[i+1];
                const actualValue = child.getAttribute(attName);
                assert.equal(actualValue, attValue, `Element ${tagName} should have attribute ${attName} with value ${attValue}`);
            }
            return child;
        }

        it('Should build an mostly empty SOAP call', function() {
            const call = makeSoapMethodCall(undefined, "xtk:session", "Empty");        // no auth
            const [ request ] = call._createHTTPRequest(URL);
            assert.equal(request.url, URL);
            assert.equal(request.method, "POST");
            assert.equal(request.headers["Content-type"], "application/soap+xml");
            assert.equal(request.headers["SoapAction"], "xtk:session#Empty");
            assert.equal(request.headers["X-Security-Token"], "");
            expect(request.headers["Cookie"]).toBeUndefined();
            const env = DomUtil.parse(request.data).documentElement;
            const header = hasChildElement(env, "SOAP-ENV:Header");
            expect(DomUtil.findElement(header, "Cookie")).toBeFalsy();
            const body = hasChildElement(env, "SOAP-ENV:Body");
            const method = hasChildElement(body, "m:Empty", undefined, "xmlns:m", "urn:xtk:session", "SOAP-ENV:encodingStyle", "http://schemas.xmlsoap.org/soap/encoding/");
        });

        it('Should have set authentication tokens', function() {
            const call = makeSoapMethodCall(undefined, "xtk:session", "Empty", "$session$", "$security$");
            const [ request ] = call._createHTTPRequest(URL);
            assert.equal(request.headers["X-Security-Token"], "$security$", "Security token matches");
            assert.equal(request.headers["X-Session-Token"], "$session$", "Session token matches");
            assert.equal(request.headers["Cookie"], "__sessiontoken=$session$", "Session token matches");
            const env = DomUtil.parse(request.data).documentElement;
            const header = hasChildElement(env, "SOAP-ENV:Header");
            const body = hasChildElement(env, "SOAP-ENV:Body");
            const method = hasChildElement(body, "m:Empty");
        });

        it('Should set boolean parameters', function() {
            const call = makeSoapMethodCall(undefined, "xtk:session", "Boolean", "$session$", "$security$");
            const values = [null, undefined, 0, 1, 2, true, false, "true", "false"];
            const expected = [ "false", "false", "false", "true", "true", "true", "false", "true", "false"];
            for (var i=0; i<values.length; i++)
                call.writeBoolean(`p${i}`, values[i]);
            const [ request ] = call._createHTTPRequest(URL);
            const env = DomUtil.parse(request.data).documentElement;
            const body = hasChildElement(env, "SOAP-ENV:Body");
            const method = hasChildElement(body, "m:Boolean");
            for (i=0; i<values.length; i++) {
                hasChildElement(method, `p${i}`, expected[i], "xsi:type", "xsd:boolean");
            }
        });

        it('Should set byte parameters', function() {
            const call = makeSoapMethodCall(undefined, "xtk:session", "Byte", "$session$", "$security$");
            const values = [null, undefined, 0, 1, 2, -3, true, false, NaN, +7, 500, "12", "1.e2", 5.1, 5.9, -5.1, -5.9];
            const expected = [ "0", "0", "0", "1", "2", "-3", "1", "0", "0", "7", "127", "12", "100", "5", "6", "-5", "-6"];
            for (var i=0; i<values.length; i++)
                call.writeByte(`p${i}`, values[i]);
            const [ request ] = call._createHTTPRequest(URL);
            const env = DomUtil.parse(request.data).documentElement;
            const body = hasChildElement(env, "SOAP-ENV:Body");
            const method = hasChildElement(body, "m:Byte");
            for (i=0; i<values.length; i++) {
                hasChildElement(method, `p${i}`, expected[i], "xsi:type", "xsd:byte");
            }
        });

        it('Should set short parameters', function() {
            const call = makeSoapMethodCall(undefined, "xtk:session", "Short", "$session$", "$security$");
            const values = [null, undefined, 0, 1, 2, -3, true, false, NaN, +7, 500, "12", "1.e2", 5.1, 5.9, -5.1, -5.9];
            const expected = [ "0", "0", "0", "1", "2", "-3", "1", "0", "0", "7", "500", "12", "100", "5", "6", "-5", "-6"];
            for (var i=0; i<values.length; i++)
                call.writeShort(`p${i}`, values[i]);
            const [ request ] = call._createHTTPRequest(URL);
            const env = DomUtil.parse(request.data).documentElement;
            const body = hasChildElement(env, "SOAP-ENV:Body");
            const method = hasChildElement(body, "m:Short");
            for (i=0; i<values.length; i++) {
                hasChildElement(method, `p${i}`, expected[i], "xsi:type", "xsd:short");
            }
        });

        it('Should set long parameters', function() {
            const call = makeSoapMethodCall(undefined, "xtk:session", "Long", "$session$", "$security$");
            const values = [null, undefined, 0, 1, 2, -3, true, false, NaN, +7, 500, "12", "1.e2", 5.1, 5.9, -5.1, -5.9];
            const expected = [ "0", "0", "0", "1", "2", "-3", "1", "0", "0", "7", "500", "12", "100", "5", "6", "-5", "-6"];
            for (var i=0; i<values.length; i++)
                call.writeLong(`p${i}`, values[i]);
            const [ request ] = call._createHTTPRequest(URL);
            const env = DomUtil.parse(request.data).documentElement;
            const body = hasChildElement(env, "SOAP-ENV:Body");
            const method = hasChildElement(body, "m:Long");
            for (i=0; i<values.length; i++) {
                hasChildElement(method, `p${i}`, expected[i], "xsi:type", "xsd:int");
            }
        });

        it('Should set int64 parameters', function() {
            const call = makeSoapMethodCall(undefined, "xtk:session", "Int64", "$session$", "$security$");
            const values = [null, undefined, 0, 1, 2, -3, true, false, NaN, +7, 500, "12"];
            const expected = [ "0", "0", "0", "1", "2", "-3", "1", "0", "0", "7", "500", "12"];
            for (var i=0; i<values.length; i++)
                call.writeInt64(`p${i}`, values[i]);
            const [ request ] = call._createHTTPRequest(URL);
            const env = DomUtil.parse(request.data).documentElement;
            const body = hasChildElement(env, "SOAP-ENV:Body");
            const method = hasChildElement(body, "m:Int64");
            for (i=0; i<values.length; i++) {
                hasChildElement(method, `p${i}`, expected[i], "xsi:type", "xsd:long");
            }
        });

        it('Should set float parameters', function() {
            const call = makeSoapMethodCall(undefined, "xtk:session", "Float", "$session$", "$security$");
            const values = [null, undefined, 0, 1, 2, -3, true, false, NaN, +7, 500, "12", "1.e2", 5.1, 5.9, -5.1, -5.9];
            const expected = [ "0", "0", "0", "1", "2", "-3", "1", "0", "0", "7", "500", "12", "100", "5.1", "5.9", "-5.1", "-5.9"];
            for (var i=0; i<values.length; i++)
                call.writeFloat(`p${i}`, values[i]);
            const [ request ] = call._createHTTPRequest(URL);
            const env = DomUtil.parse(request.data).documentElement;
            const body = hasChildElement(env, "SOAP-ENV:Body");
            const method = hasChildElement(body, "m:Float");
            for (i=0; i<values.length; i++) {
                hasChildElement(method, `p${i}`, expected[i], "xsi:type", "xsd:float");
            }
        });

        it('Should set double parameters', function() {
            const call = makeSoapMethodCall(undefined, "xtk:session", "Double", "$session$", "$security$");
            const values = [null, undefined, 0, 1, 2, -3, true, false, NaN, +7, 500, "12", "1.e2", 5.1, 5.9, -5.1, -5.9];
            const expected = [ "0", "0", "0", "1", "2", "-3", "1", "0", "0", "7", "500", "12", "100", "5.1", "5.9", "-5.1", "-5.9"];
            for (var i=0; i<values.length; i++)
                call.writeDouble(`p${i}`, values[i]);
            const [ request ] = call._createHTTPRequest(URL);
            const env = DomUtil.parse(request.data).documentElement;
            const body = hasChildElement(env, "SOAP-ENV:Body");
            const method = hasChildElement(body, "m:Double");
            for (i=0; i<values.length; i++) {
                hasChildElement(method, `p${i}`, expected[i], "xsi:type", "xsd:double");
            }
        });

        it('Should set string parameters', function() {
            const call = makeSoapMethodCall(undefined, "xtk:session", "String", "$session$", "$security$");
            const values = [null, undefined, 0, 1, 2, -3, true, false, NaN, +7, 500, "12", "1.e2", 5.1, 5.9, -5.1, -5.9, "Hello", "<>\""];
            const expected = [ "", "", "0", "1", "2", "-3", "true", "false", "", "7", "500", "12", "1.e2", "5.1", "5.9", "-5.1", "-5.9", "Hello", "<>\""];
            for (var i=0; i<values.length; i++)
                call.writeString(`p${i}`, values[i]);
            const [ request ] = call._createHTTPRequest(URL);
            const env = DomUtil.parse(request.data).documentElement;
            const body = hasChildElement(env, "SOAP-ENV:Body");
            const method = hasChildElement(body, "m:String");
            for (i=0; i<values.length; i++) {
                hasChildElement(method, `p${i}`, expected[i], "xsi:type", "xsd:string");
            }
        });

        it('Should set timestamp parameters', function() {
            const call = makeSoapMethodCall(undefined, "xtk:session", "Timestamp", "$session$", "$security$");
            const values = [null, undefined, "2020-12-31T12:34:56.789Z", 
                new Date(Date.UTC(2020, 12-1, 31, 12, 34, 56, 789)),
                new Date(Date.UTC(2020, 12-1, 31))
            ];
            const expected = [ "", "", "2020-12-31T12:34:56.789Z", "2020-12-31T12:34:56.789Z", "2020-12-31T00:00:00.000Z"];
            for (var i=0; i<values.length; i++)
                call.writeTimestamp(`p${i}`, values[i]);
            const [ request ] = call._createHTTPRequest(URL);
            const env = DomUtil.parse(request.data).documentElement;
            const body = hasChildElement(env, "SOAP-ENV:Body");
            const method = hasChildElement(body, "m:Timestamp");
            for (i=0; i<values.length; i++) {
                hasChildElement(method, `p${i}`, expected[i], "xsi:type", "xsd:datetime");
            }
        });

        it('Should set date parameters', function() {
            const call = makeSoapMethodCall(undefined, "xtk:session", "Date", "$session$", "$security$");
            const values = [null, undefined, "2020-12-31T12:34:56.789Z", 
                new Date(Date.UTC(2020, 12-1, 31, 12, 34, 56, 789)),
                new Date(Date.UTC(2020, 12-1, 31))
            ];
            const expected = [ "", "", "2020-12-31T00:00:00.000Z", "2020-12-31T00:00:00.000Z", "2020-12-31T00:00:00.000Z"];
            for (var i=0; i<values.length; i++)
                call.writeDate(`p${i}`, values[i]);
            const [ request ] = call._createHTTPRequest(URL);
            const env = DomUtil.parse(request.data).documentElement;
            const body = hasChildElement(env, "SOAP-ENV:Body");
            const method = hasChildElement(body, "m:Date");
            for (i=0; i<values.length; i++) {
                hasChildElement(method, `p${i}`, expected[i], "xsi:type", "xsd:date");
            }
        });

        it('Should set element parameters', function() {
            const xml = '<root att="Hello"><child/></root>';
            const element = DomUtil.parse(xml).documentElement;

            const call = makeSoapMethodCall(undefined, "xtk:session", "Element", "$session$", "$security$");
            call.writeElement("p", element);
            const [ request ] = call._createHTTPRequest(URL);
            const env = DomUtil.parse(request.data).documentElement;
            const body = hasChildElement(env, "SOAP-ENV:Body");
            const method = hasChildElement(body, "m:Element");
            const param = hasChildElement(method, "p");
            const actualElement = hasChildElement(param, "root");
            expect(actualElement).toBeTruthy();
            expect(actualElement.getAttribute("att")).toBe("Hello");
        });


        it('Should set element parameters using createElement', function() {
            const call = makeSoapMethodCall(undefined, "xtk:session", "Element", "$session$", "$security$");
            const element = call.createElement("root");
            element.setAttribute("att", "Hello");
            call.writeElement("p", element);
            const [ request ] = call._createHTTPRequest(URL);
            const env = DomUtil.parse(request.data).documentElement;
            const body = hasChildElement(env, "SOAP-ENV:Body");
            const method = hasChildElement(body, "m:Element");
            const param = hasChildElement(method, "p");
            const actualElement = hasChildElement(param, "root");
            expect(actualElement).toBeTruthy();
            expect(actualElement.getAttribute("att")).toBe("Hello");
        });

        it('Should write null element', function() {
            const call = makeSoapMethodCall(undefined, "xtk:session", "Element", "$session$", "$security$");
            call.writeElement("p", null);
            call.writeElement("q", undefined);
            const [ request ] = call._createHTTPRequest(URL);
            const env = DomUtil.parse(request.data).documentElement;
            const body = hasChildElement(env, "SOAP-ENV:Body");
            const method = hasChildElement(body, "m:Element");
            var param = hasChildElement(method, "p");
            expect(DomUtil.getFirstChildElement(param)).toBeNull();
            param = hasChildElement(method, "q");
            expect(DomUtil.getFirstChildElement(param)).toBeNull();
        });

        it('Should set document parameters', function() {
            const xml = '<root att="Hello"><child/></root>';
            const doc = DomUtil.parse(xml);

            const call = makeSoapMethodCall(undefined, "xtk:session", "Document", "$session$", "$security$");
            call.writeDocument("p", doc);
            const [ request ] = call._createHTTPRequest(URL);
            const env = DomUtil.parse(request.data).documentElement;
            const body = hasChildElement(env, "SOAP-ENV:Body");
            const method = hasChildElement(body, "m:Document");
            const param = hasChildElement(method, "p");
            const actualElement = hasChildElement(param, "root");
            expect(actualElement).toBeTruthy();
            expect(actualElement.getAttribute("att")).toBe("Hello");
        });

        it('Should support passing DOM elements instead of document parameters', function() {
            const xml = '<root att="Hello"><child/></root>';
            const doc = DomUtil.parse(xml);

            const call = makeSoapMethodCall(undefined, "xtk:session", "Document", "$session$", "$security$");
            call.writeDocument("p", doc.documentElement);
            const [ request ] = call._createHTTPRequest(URL);
            const env = DomUtil.parse(request.data).documentElement;
            const body = hasChildElement(env, "SOAP-ENV:Body");
            const method = hasChildElement(body, "m:Document");
            const param = hasChildElement(method, "p");
            const actualElement = hasChildElement(param, "root");
            expect(actualElement).toBeTruthy();
            expect(actualElement.getAttribute("att")).toBe("Hello");
        });

        it('Should write null document', function() {
            const call = makeSoapMethodCall(undefined, "xtk:session", "Document", "$session$", "$security$");
            call.writeDocument("p", null);
            call.writeDocument("q", undefined);
            const [ request ] = call._createHTTPRequest(URL);
            const env = DomUtil.parse(request.data).documentElement;
            const body = hasChildElement(env, "SOAP-ENV:Body");
            const method = hasChildElement(body, "m:Document");
            var param = hasChildElement(method, "p");
            expect(DomUtil.getFirstChildElement(param)).toBeNull();
            param = hasChildElement(method, "q");
            expect(DomUtil.getFirstChildElement(param)).toBeNull();
        });

    });

    describe("Invalid SOAP responses", function() {

        it("Should fail on empty return value", async () => {
            const transport = function() { return Promise.resolve(""); };
            const call = makeSoapMethodCall(transport, "xtk:session", "Date", "$session$", "$security$");
            call.finalize(URL);
            await expect(call.execute()).rejects.toMatchObject({ statusCode: 500 });      // "" cannot be parsed as XML
        });


        it("Should fail on non-XML return value", async () => {
            const transport = function() { return Promise.resolve("{'this':'is', 'not':'xml'}"); };
            const call = makeSoapMethodCall(transport, "xtk:session", "Date", "$session$", "$security$");
            call.finalize(URL);
            await expect(call.execute()).rejects.toMatchObject({ statusCode: 500 });      // cannot be parsed as XML
        });

        it("Should fail if no SOAP body", async () => {
            const transport = function() { return Promise.resolve(makeSOAPResponseWithNoBody()); };
            const call = makeSoapMethodCall(transport, "xtk:session", "Date", "$session$", "$security$");
            call.finalize(URL);
            await expect(call.execute()).rejects.toMatchObject({ statusCode: 500 });      // body missing
        });

        it("Should fail if empty SOAP body", function() {
            const transport = function() { return Promise.resolve(makeSOAPResponseWithEmptyBody()); };
            const call = makeSoapMethodCall(transport, "xtk:session", "Date", "$session$", "$security$");
            call.finalize(URL);
            return call.execute().catch(e => {
                expect(e.faultString).toMatch('Malformed SOAP response');      // body present but empty
            });
        });

        it("Should handle no response parameters", function() {
            const transport = function() { return Promise.resolve(makeSOAPResponse("Date")); };
            const call = makeSoapMethodCall(transport, "xtk:session", "Date", "$session$", "$security$");
            call.finalize(URL);
            return call.execute().then(() => {
                expect(call.checkNoMoreArgs()).toBe(true);
                expect(() => call.getNextString()).toThrow();
            });
        });

        it("Should handle no extra elements", function() {
            const transport = function() { return Promise.resolve(makeSOAPResponseWithExtraElements("Extra")); };
            const call = makeSoapMethodCall(transport, "xtk:session", "Extra", "$session$", "$security$");
            call.finalize(URL);
            return call.execute().then(() => {
                expect(call.checkNoMoreArgs()).toBe(true);
                expect(() => call.getNextString()).toThrow();
            });
        });
        it("Should should fail on unread responses", function() {
            const transport = function() { return Promise.resolve(makeSOAPResponse("Date", "p", "xsd:string", "dummy")); };
            const call = makeSoapMethodCall(transport, "xtk:session", "Date", "$session$", "$security$");
            call.finalize(URL);
            return call.execute().then(() => {
                expect(call.checkNoMoreArgs()).toBe(false);
            });
        });

        it("Should should read response", function() {
            const transport = function() { 
                return Promise.resolve(makeSOAPResponse("Date", 
                    "p", "xsd:string", "Hello",
                    "p", "xsd:string", "World",         // a second string
                    "p", "xsd:boolean", "true",
                    "p", "xsd:boolean", "1",
                    "p", "xsd:byte", "7",
                    "p", "xsd:short", "700",
                    "p", "xsd:int", "200000",
                    "p", "xsd:float", "3.14",
                    "p", "xsd:double", "6.28",
                    "p", "xsd:dateTime", "2020-12-31T12:34:56.789Z",
                    "p", "xsd:date", "2020-12-31T00:00:00.000Z",
                    "p", "xsd:long", "1234567890123456789",
                )); 
            };
            const call = makeSoapMethodCall(transport, "xtk:session", "Date", "$session$", "$security$");
            call.finalize(URL);
            return call.execute().then(() => {
                expect(call.getNextString()).toBe("Hello");
                expect(call.checkNoMoreArgs()).toBe(false);

                expect(call.getNextString()).toBe("World");
                expect(call.checkNoMoreArgs()).toBe(false);

                expect(call.getNextBoolean()).toBe(true);
                expect(call.checkNoMoreArgs()).toBe(false);

                expect(call.getNextBoolean()).toBe(true);
                expect(call.checkNoMoreArgs()).toBe(false);

                expect(call.getNextByte()).toBe(7);
                expect(call.checkNoMoreArgs()).toBe(false);
                
                expect(call.getNextShort()).toBe(700);
                expect(call.checkNoMoreArgs()).toBe(false);
                
                expect(call.getNextLong()).toBe(200000);
                expect(call.checkNoMoreArgs()).toBe(false);
                
                expect(call.getNextFloat()).toBe(3.14);
                expect(call.checkNoMoreArgs()).toBe(false);
                
                expect(call.getNextDouble()).toBe(6.28);
                expect(call.checkNoMoreArgs()).toBe(false);

                expect(call.getNextDateTime().toISOString()).toBe("2020-12-31T12:34:56.789Z");
                expect(call.checkNoMoreArgs()).toBe(false);

                expect(call.getNextDate().toISOString()).toBe("2020-12-31T00:00:00.000Z");
                expect(call.checkNoMoreArgs()).toBe(false);

                expect(call.getNextInt64()).toBe("1234567890123456789");
                expect(call.checkNoMoreArgs()).toBe(true);
            });
        });

        it("Should not throw sesion expired exception", function() {
          const transport = function() { 
              return Promise.resolve(makeSOAPResponse("Date", 
                  "p", "xsd:string", "XSV-350008 Session has expired or is invalid. Please reconnect.",
              )); 
          };
          const call = makeSoapMethodCall(transport, "xtk:session", "Date", "$session$", "$security$");
          call.finalize(URL);
          return call.execute().then(() => {
              expect(call.getNextString()).toBe("XSV-350008 Session has expired or is invalid. Please reconnect.");
          });
        });

        it("Should should read Element response", function() {
            const xml = '<root att="Hello"><child/></root>';
            const transport = function() { 
                return Promise.resolve(makeSOAPResponse("Date", "p", "ns:Element", xml)); 
            };
            const call = makeSoapMethodCall(transport, "xtk:session", "Date", "$session$", "$security$");
            call.finalize(URL);
            return call.execute().then(() => {
                expect(DomUtil.toXMLString(call.getNextElement())).toBe(xml);
                expect(call.checkNoMoreArgs()).toBe(true);
            });
        });

        it("Should check response type", function() {
            const transport = function() { 
                return Promise.resolve(makeSOAPResponse("Date", "p", "xsd:string", "Hello" )); 
            };
            const call = makeSoapMethodCall(transport, "xtk:session", "Date", "$session$", "$security$");
            call.finalize(URL);
            return call.execute().then(() => {
                expect(() => call.getNextByte()).toThrow();         // should use getNextString
            });
        });


        it("Should read Document response", function() {
            const xml = '<root att="Hello"><child/></root>';
            const transport = function() { 
                return Promise.resolve(makeSOAPResponse("Date", "p", "ns:Document", xml)); 
            };
            const call = makeSoapMethodCall(transport, "xtk:session", "Date", "$session$", "$security$");
            call.finalize(URL);
            return call.execute().then(() => {
                expect(DomUtil.toXMLString(call.getNextDocument())).toBe(xml);
                expect(call.checkNoMoreArgs()).toBe(true);
            });
        });

        it("Should should read empty Element response", function() {
            const transport = function() { 
                return Promise.resolve(makeSOAPResponse("Date", "p", "ns:Element", "")); 
            };
            const call = makeSoapMethodCall(transport, "xtk:session", "Date", "$session$", "$security$");
            call.finalize(URL);
            return call.execute().then(() => {
                expect(call.getNextElement()).toBeNull();
            });
        });

        it("Should should read empty Document response", function() {
            const transport = function() { 
                return Promise.resolve(makeSOAPResponse("Date", "p", "ns:Document", "")); 
            };
            const call = makeSoapMethodCall(transport, "xtk:session", "Date", "$session$", "$security$");
            call.finalize(URL);
            return call.execute().then(() => {
                expect(call.getNextDocument()).toBeNull();
            });
        });

        it("Should not read element past end", function() {
            const transport = function() { return Promise.resolve(makeSOAPResponse("Date")); };
            const call = makeSoapMethodCall(transport, "xtk:session", "Date", "$session$", "$security$");
            call.finalize(URL);
            return call.execute().then(() => {
                expect(() => call.getNextElement()).toThrow();
            });
        });

        it("Should not read document past end", function() {
            const transport = function() { return Promise.resolve(makeSOAPResponse("Date")); };
            const call = makeSoapMethodCall(transport, "xtk:session", "Date", "$session$", "$security$");
            call.finalize(URL);
            return call.execute().then(() => {
                expect(() => call.getNextDocument()).toThrow();
            });
        });

        describe("Read entity for mutable calls", () => {
            it("Should support not having an entity (non-mutable call)", () => {
                const transport = function() { 
                    return Promise.resolve(makeSOAPResponse("SelectAll")); 
                };
                const call = makeSoapMethodCall(transport, "xtk:session", "SelectAll", "$session$", "$security$");
                call.finalize(URL);
                return call.execute().then(() => {
                    const entity = call.getEntity();
                    expect(entity).toBeNull();
                });
            })
            it("Should read entity if that's the only element returned", () => {
                const transport = function() { 
                    return Promise.resolve(makeSOAPResponse("SelectAll", "entity", "ns:Element", "<queryDef/>")); 
                };
                const call = makeSoapMethodCall(transport, "xtk:session", "SelectAll", "$session$", "$security$");
                call.finalize(URL);
                return call.execute().then(() => {
                    const entity = call.getEntity();
                    expect(DomUtil.toXMLString(entity)).toBe("<queryDef/>");
                });
            })

            it("Should read entity if there are returned values too", () => {
                const transport = function() { 
                    return Promise.resolve(makeSOAPResponse("SelectAll", "entity", "ns:Element", "<queryDef/>", "p", "xsd:string", "Hello")); 
                };
                const call = makeSoapMethodCall(transport, "xtk:session", "SelectAll", "$session$", "$security$");
                call.finalize(URL);
                return call.execute().then(() => {
                    const entity = call.getEntity();
                    expect(DomUtil.toXMLString(entity)).toBe("<queryDef/>");
                    // Read first return value
                    expect(call.getNextString()).toBe("Hello");
                });
            })

            it("Should ignore entity element if it is not of the expected element type. This will be considered as a parameter", () => {
                const transport = function() { 
                    return Promise.resolve(makeSOAPResponse("SelectAll", "entity", "xsd:string", "<queryDef/>")); 
                };
                const call = makeSoapMethodCall(transport, "xtk:session", "SelectAll", "$session$", "$security$");
                call.finalize(URL);
                return call.execute().then(() => {
                    const entity = call.getEntity();
                    expect(entity).toBeNull();
                    expect(call.getNextString()).toBe("<queryDef/>");
                });
            })


        })
    });


    describe("Handle SOAP faults", function() {

        it("Should simulate SOAP fault", function() {
            const transport = function() { 
                return Promise.resolve(makeSOAPFault("-53", "failed", "The SOAP call failed")); 
            };
            const call = makeSoapMethodCall(transport, "xtk:session", "Date", "$session$", "$security$");
            call.finalize(URL);
            return call.execute().catch(e => {
                expect(e.faultCode).toBe("-53");
                expect(e.faultString).toBe("failed");
            });
        });

        it("Should simulate a SOAP fault without a detail node", () => {
            const transport = function() { 
                return Promise.resolve(makeSOAPFaultNoDetail("-53", "failed")); 
            };
            const call = makeSoapMethodCall(transport, "xtk:session", "Date", "$session$", "$security$");
            call.finalize(URL);
            return call.execute().catch(e => {
                expect(e.faultCode).toBe("-53");
                expect(e.faultString).toBe("failed");
            });
        })
    });

    describe("Charset encoding", function() {

        it("Should support no encoding", function() {
            const call = makeSoapMethodCall(undefined, "xtk:session", "Empty");
            const [ request ] = call._createHTTPRequest(URL);
            assert.equal(request.url, URL);
            assert.equal(request.headers["Content-type"], "application/soap+xml");
        });

        it("Should support UTF-8 encoding", function() {
            const call = makeSoapMethodCall(undefined, "xtk:session", "Empty", undefined, undefined, undefined, { charset: "UTF-8" });
            const [ request ] = call._createHTTPRequest(URL);
            assert.equal(request.url, URL);
            assert.equal(request.headers["Content-type"], "application/soap+xml;charset=UTF-8");
        });

        it("Default encoding should be UTF-8", async () => {
            const connectionParameters = sdk.ConnectionParameters.ofSessionToken("http://acc-sdk:8080", "mc/");
            const client = await sdk.init(connectionParameters);
            client._transport = jest.fn();
            expect(client._connectionParameters._options.charset).toBe('UTF-8');
            const soapCall = client._prepareSoapCall("xtk:persist", "GetEntityIfMoreRecent", true, true);
            expect (soapCall._charset).toBe('UTF-8');
            const [ request ] = soapCall._createHTTPRequest(URL);
            assert.equal(request.headers["Content-type"], "application/soap+xml;charset=UTF-8");
        })

        it("Default support forcing an empty encoding", async () => {
            const connectionParameters = sdk.ConnectionParameters.ofSessionToken("http://acc-sdk:8080", "mc/", { charset: "" });
            const client = await sdk.init(connectionParameters);
            client._transport = jest.fn();
            expect(client._connectionParameters._options.charset).toBe('');
            const soapCall = client._prepareSoapCall("xtk:persist", "GetEntityIfMoreRecent", true, true);
            expect (soapCall._charset).toBe('');
            const [ request ] = soapCall._createHTTPRequest(URL);
            assert.equal(request.headers["Content-type"], "application/soap+xml");
        })

        it("Default support forcing an ISO charset", async () => {
            const connectionParameters = sdk.ConnectionParameters.ofSessionToken("http://acc-sdk:8080", "mc/", { charset: "ISO-8859-1" });
            const client = await sdk.init(connectionParameters);
            client._transport = jest.fn();
            expect(client._connectionParameters._options.charset).toBe('ISO-8859-1');
            const soapCall = client._prepareSoapCall("xtk:persist", "GetEntityIfMoreRecent", true, true);
            expect (soapCall._charset).toBe('ISO-8859-1');
            const [ request ] = soapCall._createHTTPRequest(URL);
            assert.equal(request.headers["Content-type"], "application/soap+xml;charset=ISO-8859-1");
        })
    });
    
});


describe("Campaign exception", () => {

    it("Http errors", () => {
        const err = {
            statusCode: 504, 
            error: "This call failed",
            options: {
                url: "http://test.com/r/test"
            },
            response: {
                body: "Response body"
            }
        };
        const ex = new CampaignException({ request:err.options, response: err.response.body }, err.statusCode, "", err.error, undefined);
        expect(ex.name).toBe("CampaignException");
        expect(ex.statusCode).toBe(504);
        expect(ex.faultCode).toBe("");
        expect(ex.errorCode).toBe("");
        expect(ex.faultString).toBe("This call failed");
        expect(ex.message).toBe("504 - Error calling method '/r/test': This call failed");
        expect(ex.methodCall.type).toBe("HTTP");
        expect(ex.methodCall.methodName).toBe("/r/test");
    });

    it('Default error message for 403 http code', () => {
        const ex = new CampaignException(undefined, 403);
        expect(ex.name).toBe("CampaignException");
        expect(ex.statusCode).toBe(403);
        expect(ex.faultString).toBe("Forbidden");
    })

    it('error message', () => {
        expect(new CampaignException({ request:{ url:'/r/test' } }, 403).message).toBe("403 - Error calling method '/r/test': Forbidden");
        expect(new CampaignException({ request:{ url:'/r/test' } }, 500).message).toBe("500 - Error calling method '/r/test': No error message was provided");
        expect(new CampaignException({ request:{ url:'/r/test' } }, 500, undefined, "fault").message).toBe("500 - Error calling method '/r/test': fault");
        expect(new CampaignException({ request:{ url:'/r/test' } }, 500, undefined, undefined, "detail").message).toBe("500 - Error calling method '/r/test': detail");
        expect(new CampaignException({ request:{ url:'/r/test' } }, 500, undefined, "fault", "detail").message).toBe("500 - Error calling method '/r/test': fault. detail");
    });

    it("Should extract campaign code from fault string", () => {
        expect(new CampaignException({ request:{ url:'/r/test' } }, 403, undefined, "Hello The '193.104.215.11' IP address via which...").errorCode).toBe("");
        expect(new CampaignException({ request:{ url:'/r/test' } }, 403, undefined, "Hello The '193.104.215.11' IP address via which...").faultString).toBe("Hello The '193.104.215.11' IP address via which...");

        expect(new CampaignException({ request:{ url:'/r/test' } }, 403, undefined, "XSV-350013 The '193.104.215.11' IP address via which...").errorCode).toBe("XSV-350013");
        expect(new CampaignException({ request:{ url:'/r/test' } }, 403, undefined, "XSV-350013 The '193.104.215.11' IP address via which...").faultString).toBe("The '193.104.215.11' IP address via which...");
    })

    it("Should decode HTTP method name", () => {
        expect(new CampaignException({ request:{ url:'/r/test' } }, 403).methodCall.methodName).toBe("/r/test");
        expect(new CampaignException({ request:{ url:'http://hello.com/r/test' } }, 403).methodCall.methodName).toBe("/r/test");
        expect(new CampaignException({ request:{ url:'http://hello.com:8080/r/test' } }, 403).methodCall.methodName).toBe("/r/test");
        expect(new CampaignException({ request:{ url:'http://hello.com:8080' } }, 403).methodCall.methodName).toBe("");
    });

    it("Should ignore bogus fault strings", () => {
        expect(new CampaignException(undefined, 500, undefined, "").faultString).toBe("");
        expect(new CampaignException(undefined, 500, undefined, null).faultString).toBe("");
        expect(new CampaignException(undefined, 500, undefined, undefined).faultString).toBe("");
        expect(new CampaignException(undefined, 500, undefined, "null").faultString).toBe("");
        expect(new CampaignException(undefined, 500, undefined, "null\n").faultString).toBe("");
        expect(new CampaignException(undefined, 500, undefined, "Hello").faultString).toBe("Hello");
    })

    it("Should make Campaign exception if cause has no ctor", () => {
        expect(makeCampaignException(undefined, "Hello").faultString).toBe("Hello");
        expect(makeCampaignException(undefined, new Error("Hello")).faultString).toBe("Error (Hello)");
    })

    describe("Public interface", () => {
        it("Should have public member variables", () => {
            const call = makeSoapMethodCall(undefined, "xtk:session", "Date", "$session$", "$security$");
            expect(call.urn).toBe("xtk:session");
            expect(call.methodName).toBe("Date");
            expect(call.internal).toStrictEqual(false);
            expect(call.request).toBeUndefined();
            expect(call.response).toBeUndefined();
        })

        it("Should have HTTP request", () => {
            const call = makeSoapMethodCall(undefined, "xtk:session", "Date", "$session$", "$security$");
            const [ request ] = call._createHTTPRequest(URL);
            assert.equal(request.url, URL);
        })

    })

    it("aborting pending HTTP calls to avoid unnecessary attempts to re-render.", function() {
        const transport = function() { 
            return Promise.reject({name: 'AbortError'}); 
        };
        const call = makeSoapMethodCall(transport, "xtk:session", "Date", "$session$", "$security$");
        return call.execute().catch((ex) => {
            expect(ex.statusCode).toBe(500);
            expect(ex.faultCode).toBe(-53);
            expect(ex.message).toBe(`500 - Error -53: SDK-000016 Request was aborted by the client`);
        });
    });

    describe("User agent", () => {
        it("Should set user agent", () => {
            const call = makeSoapMethodCall(undefined, "xtk:session", "Date", "$session$", "$security$", "My User Agent");
            const [ request ] = call._createHTTPRequest(URL);
            expect(request.headers['User-Agent']).toBe("My User Agent");
        })

        it("Should support no user agent", () => {
            const call = makeSoapMethodCall(undefined, "xtk:session", "Date", "$session$", "$security$", undefined);
            const [ request ] = call._createHTTPRequest(URL);
            expect(request.headers['User-Agent']).toBeUndefined();
        })
    })

    it("CampaignException should hide sensitive information", () => {
        const call = makeSoapMethodCall(undefined, "xtk:session", "Date", "$session$", "$security$", "My User Agent");
        call.finalize("http://ffdamkt:8080/nl/jsp/soaprouter.jsp")
        const ex = makeCampaignException(call, new Error("Failed"));
        const req = ex.methodCall.request;
        expect(req.data.indexOf("$session$")).toBe(-1);
        expect(req.data.indexOf("$security$")).toBe(-1);
        expect(req.headers.Cookie.indexOf("$session$")).toBe(-1);
        expect(req.headers.Cookie.indexOf("$security$")).toBe(-1);
        expect(req.headers["X-Security-Token"].indexOf("$session$")).toBe(-1);
        expect(req.headers["X-Security-Token"].indexOf("$security$")).toBe(-1);
    })

    describe('Extra Http headers', () => {
        it("Should take additional headers", () => {
            const call = makeSoapMethodCall(undefined, "xtk:session", "Date", "$session$", "$security$", "My User Agent", undefined, { 'X-ACC-UI-Version': '1.0' });
            const [ request ] = call._createHTTPRequest(URL);
            expect(request.headers['User-Agent']).toBe("My User Agent");
            expect(request.headers['X-ACC-UI-Version']).toBe("1.0");
            expect(request.headers['SoapAction']).toBe("xtk:session#Date");
        });

        it("Should override default headers headers", () => {
            const call = makeSoapMethodCall(undefined, "xtk:session", "Date", "$session$", "$security$", "My User Agent", undefined, { 'X-ACC-UI-Version': '1.0', 'SoapAction': 'My soap action' });
            const [ request ] = call._createHTTPRequest(URL);
            expect(request.headers['User-Agent']).toBe("My User Agent");
            expect(request.headers['X-ACC-UI-Version']).toBe("1.0");
            expect(request.headers['SoapAction']).toBe("My soap action");
        });
    });

    describe('Adding method name in the URL', () => {
        it("Should add the method name by default in the URL", () => {
            const call = makeSoapMethodCall(undefined, "xtk:session", "Empty", "$session$", "$security$");
            call.finalize(URL);
            expect(call.request.url).toBe("https://soap-test/nl/jsp/soaprouter.jsp?soapAction=xtk%3Asession%23Empty");
        });

        it("Should be able to disable adding the method name by default in the URL", () => {
            const call = makeSoapMethodCall(undefined, "xtk:session", "Empty", "$session$", "$security$", undefined, { noMethodInURL: true });
            call.finalize(URL);
            expect(call.request.url).toBe("https://soap-test/nl/jsp/soaprouter.jsp");
        });
    });

});

