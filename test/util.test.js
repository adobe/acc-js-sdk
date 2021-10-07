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
 * Unit tests for utilities
 * 
 *********************************************************************************/

const { Util } = require('../src/util.js');


describe('Util', function() {

    it("Should test if object is an array", () => {
        expect(Util.isArray(null)).toBe(false);
        expect(Util.isArray(undefined)).toBe(false);
        expect(Util.isArray(0)).toBe(false);
        expect(Util.isArray("nope")).toBe(false);
        expect(Util.isArray({})).toBe(false);
        expect(Util.isArray({ length: 1 })).toBe(false);
        expect(Util.isArray({ length: 1, push: null })).toBe(false);
        expect(Util.isArray({ length: 1, push: "string" })).toBe(false);

        expect(Util.isArray([])).toBe(true);
        expect(Util.isArray([ 1 ])).toBe(true);
    });

    describe("Util.trim", () => {
        it("Should remove trailing spaces", () => {
            expect(Util.trim("Hello   \n \r \t ")).toBe("Hello");
        })
        it("Should handle null", () => {
            expect(Util.trim(null)).toBe(undefined);    // null => undefined so that we remove undefined properties
        })

        it("Should handle undefined", () => {
            expect(Util.trim(undefined)).toBe(undefined);
        })

        it("Should handle numbers", () => {
            expect(Util.trim(2)).toBe(2);
        })

        it("Should handle arrays", () => {
            expect(Util.trim([2, "Hello", true])).toStrictEqual([2, "Hello", true]);
        })

        it("Should handle null attribute", () => {
            expect(Util.trim({hello:"World", world:null})).toStrictEqual({hello:"World", world:undefined});
        })

        it("Should remove session token cookies", () => {
            expect(Util.trim({hello:"Lead<Cookie>__sessiontoken=mytoken</Cookie>Trail"})).toStrictEqual({hello:"Lead<Cookie>__sessiontoken=***</Cookie>Trail"});
        })

        it("Should remove multiple session token cookies", () => {
            expect(Util.trim({hello:"Lead<Cookie>__sessiontoken=mytoken</Cookie><Cookie>__sessiontoken=mytoken</Cookie>Trail"})).toStrictEqual({hello:"Lead<Cookie>__sessiontoken=***</Cookie><Cookie>__sessiontoken=***</Cookie>Trail"});
        })

        it("Should handle unfinished session token cookie", () => {
            expect(Util.trim({hello:"Lead<Cookie>__sessiontoken=mytoken<Cookie>__sessiontoken=mytokenTrail"})).toStrictEqual({hello:"Lead<Cookie>__sessiontoken=mytoken<Cookie>__sessiontoken=mytokenTrail"});
        })

        it("Should remove security tokens", () => {
            expect(Util.trim({hello:"Lead<X-Security-Token>Stuff</X-Security-Token>Trail"})).toStrictEqual({hello:"Lead<X-Security-Token>***</X-Security-Token>Trail"});
        })

        it("Should remove session tokens", () => {
            expect(Util.trim({hello:'Lead<sessiontoken xsi:type="xsd:string">Stuff</sessiontoken>Trail'})).toStrictEqual({hello:'Lead<sessiontoken xsi:type="xsd:string">***</sessiontoken>Trail'});
        })

        it("Should remove password", () => {
            expect(Util.trim({hello:`<sessiontoken xsi:type="xsd:string"/><login xsi:type="xsd:string">admin</login><password xsi:type="xsd:string">password</password><parameters xsi:type="ns:Element" SOAP-ENV:encodingStyle="http://xml.apache.org/xml-soap/literalxml"/>`})).toStrictEqual({hello:`<sessiontoken xsi:type="xsd:string"/><login xsi:type="xsd:string">admin</login><password xsi:type="xsd:string">***</password><parameters xsi:type="ns:Element" SOAP-ENV:encodingStyle="http://xml.apache.org/xml-soap/literalxml"/>`});
        })

    })

});
