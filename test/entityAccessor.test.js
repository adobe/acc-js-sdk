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

const { DomUtil } = require("../src/dom");
const { EntityAccessor } = require("../src/entityAccessor");


/**********************************************************************************
 * 
 * Test the entity accessor
 * 
 *********************************************************************************/

describe("EntityAccessor", () => {

    describe("XML format", () => {

        const entity = DomUtil.parse(`<root string="hello" number="43" bool="true">
            <alone/>
            <chapter name="1"/>
            <chapter name="2"/>
            <chapter name="3"/>
        </root>`).documentElement;

        it("Should find attribute", () => {
            expect(EntityAccessor.getAttributeAsString(entity, "string")).toBe("hello");
            expect(EntityAccessor.getAttributeAsLong(entity, "number")).toBe(43);
            expect(EntityAccessor.getAttributeAsBoolean(entity, "bool")).toBe(true);
        });

        it("Should get element by tag", () => {
            expect(EntityAccessor.getElement(entity, "alone")).toBeTruthy();
            expect(EntityAccessor.getElement(entity, "chapter")).toBeTruthy();
        })

        it("Should get elements by tag", () => {
            expect(EntityAccessor.getChildElements(entity, "chapter").length).toBe(3);
        })

        it("Should support getting elements which do not exist", () => {
            expect(EntityAccessor.getElement(entity, "notFound")).toBeNull();
            expect(EntityAccessor.getChildElements(entity, "notFound").length).toBe(0);
        })
    })

    describe("BadgerFish format", () => {

        const entity = { "__representation": "BadgerFish", "@string": "hello", "@number": "43", "@bool": "true",
            "alone": {},
            "chapter": [
                { "@name": 1 },
                { "@name": 2 },
                { "@name": 3 },   
            ]
        };

        it("Should find attribute", () => {
            expect(EntityAccessor.getAttributeAsString(entity, "string")).toBe("hello");
            expect(EntityAccessor.getAttributeAsLong(entity, "number")).toBe(43);
            expect(EntityAccessor.getAttributeAsBoolean(entity, "bool")).toBe(true);
        });

        it("Should get element by tag", () => {
            expect(EntityAccessor.getElement(entity, "alone")).toBeTruthy();
            expect(EntityAccessor.getElement(entity, "chapter")).toBeTruthy();
        })

        it("Should get elements by tag", () => {
            expect(EntityAccessor.getChildElements(entity, "chapter").length).toBe(3);
        })

        it("Should support getting elements which do not exist", () => {
            expect(EntityAccessor.getElement(entity, "notFound")).toBeNull();
            expect(EntityAccessor.getChildElements(entity, "notFound").length).toBe(0);
        })

    })

    describe("SimpleJson format", () => {

        const entity = { "string": "hello", "number": "43", "bool": "true",
            "alone": {},
            "chapter": [
                { "@name": 1 },
                { "@name": 2 },
                { "@name": 3 },   
            ]
        };

        it("Should find attribute", () => {
            expect(EntityAccessor.getAttributeAsString(entity, "string")).toBe("hello");
            expect(EntityAccessor.getAttributeAsLong(entity, "number")).toBe(43);
            expect(EntityAccessor.getAttributeAsBoolean(entity, "bool")).toBe(true);
        });

        it("Should get element by tag", () => {
            expect(EntityAccessor.getElement(entity, "alone")).toBeTruthy();
            expect(EntityAccessor.getElement(entity, "chapter")).toBeTruthy();
        })

        it("Should get elements by tag", () => {
            expect(EntityAccessor.getChildElements(entity, "chapter").length).toBe(3);
        })

        it("Should support getting elements which do not exist", () => {
            expect(EntityAccessor.getElement(entity, "notFound")).toBeNull();
            expect(EntityAccessor.getChildElements(entity, "notFound").length).toBe(0);
        })

    })
/*
    it("Should determine if string is an attribute name", () => {
        expect(EntityAccessor.isAttributeName("")).toBe(false);
        expect(EntityAccessor.isAttributeName("H")).toBe(false);
        expect(EntityAccessor.isAttributeName("Hello")).toBe(false);
        expect(EntityAccessor.isAttributeName("@")).toBe(true);
        expect(EntityAccessor.isAttributeName("@Hello")).toBe(true);
    })
*/
});