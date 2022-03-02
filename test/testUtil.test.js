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

const sdk = require("../src");
const { DomUtil } = require("../src/domUtil");
 
describe('TestUtil', function() {

    describe('Creating test schema', () => {
        it ('Should create schema from string', () => {
            const schema = sdk.TestUtil.newSchema(`
                <schema namespace="nms" name="recipient">
                    <enumeration name="gender" basetype="byte">
                    <value name="unknown" label="None specified" value="0"/>
                    <value name="male" label="Male" value="1"/>
                    <value name="female" label="Female" value="2"/>
                    </enumeration>
                    <element name="recipient">
                    <attribute name="id" type="long"/>
                    <attribute name="email" type="string"/>
                    <attribute name="age" type="long"/>
                    <attribute name="gender" type="long" enum="nms:recipient:gender"/>
                    </element>
                </schema>
            `);
            expect(schema.id).toBe("nms:recipient");
        });

        it ('Should create schema from XML', () => {
            const xml = DomUtil.parse(`
                <schema namespace="nms" name="recipient">
                    <enumeration name="gender" basetype="byte">
                    <value name="unknown" label="None specified" value="0"/>
                    <value name="male" label="Male" value="1"/>
                    <value name="female" label="Female" value="2"/>
                    </enumeration>
                    <element name="recipient">
                    <attribute name="id" type="long"/>
                    <attribute name="email" type="string"/>
                    <attribute name="age" type="long"/>
                    <attribute name="gender" type="long" enum="nms:recipient:gender"/>
                    </element>
                </schema>
            `);
            // From DOM document
            let schema = sdk.TestUtil.newSchema(xml);
            expect(schema.id).toBe("nms:recipient");
            // From DOM element
            schema = sdk.TestUtil.newSchema(xml.documentElement);
            expect(schema.id).toBe("nms:recipient");
        });
    });

});

