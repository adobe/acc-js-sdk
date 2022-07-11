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
 * Mock functions for unit tests
 *
 *********************************************************************************/
 const sdk = require('../src/index.js');
 const crypto = require("crypto");

 const makeKey = () => {
    const a = [];
    for (let i=0; i<32; i++) {
        a.push(Math.floor(crypto.randomInt(0, 256)));
    }
    const buffer = Buffer.from(a);
    const s = buffer.toString('base64');
    return s;
 }

 async function makeAnonymousClient(options) {
    const connectionParameters = sdk.ConnectionParameters.ofAnonymousUser("http://acc-sdk:8080", options);
    const client = await sdk.init(connectionParameters);
    if (!options || !options.transport) // allow tests to explicitely set the transport
        client._transport = jest.fn();
    return client;
}

async function makeClient(options) {
    const connectionParameters = sdk.ConnectionParameters.ofUserAndPassword("http://acc-sdk:8080", "admin", "admin", options);
    const client = await sdk.init(connectionParameters);
    if (!options || !options.transport) // allow tests to explicitely set the transport
        client._transport = jest.fn();
    return client;
}

/**
 * Calls an async function and intercepts calls to console.log at the same time, and put the result in an array.
 * @param {*} fn the async function to call
 * @returns an array of logged messages
 */
async function withMockConsole(fn) {
    const logs = [];
    jest.spyOn(console, 'log').mockImplementation((message) => {
        logs.push(message);
    });
    try {
        await fn();
        return logs;
    } finally {
        console.log.mockRestore();
    }
}

const R_TEST = Promise.resolve(`<redir status='OK' date='2021-08-27 08:02:07.963-07' build='9236' sha1='cc45440' instance='xxx_mkt_prod1' sourceIP='193.104.215.11' host='xxxol.campaign.adobe.com' localHost='xxxol-mkt-prod1-1'/>`);

const PING = Promise.resolve("OK\n2021-08-27 15:43:48.862Z\n");

const MC_PING = Promise.resolve("Ok\n2021-08-27 15:48:07.893Z\n7/400 pending events");
const MC_PING_ERROR = Promise.resolve("Error\nThe queue is full (7/400)");

const LOGON_RESPONSE = Promise.resolve(`<?xml version='1.0'?>
    <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:xtk:session' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
    <SOAP-ENV:Body>
        <LogonResponse xmlns='urn:xtk:session' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
            <pstrSessionToken xsi:type='xsd:string'>___$session_token$</pstrSessionToken>
            <pSessionInfo xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
            <sessionInfo>
                <serverInfo advisedClientBuildNumber="0" allowSQL="false" buildNumber="9219" commitId="f5f3ec3" databaseId="uFE80000000000000F1FA913DD7CC7C480041161C" defaultNameSpace="cus" fohVersion="2" instanceName="ffdamkt" majNumber="6" minClientBuildNumber="8969" minNumber="7" minNumberTechnical="0" releaseName="20.3" securityTimeOut="86400" serverDate="2020-07-05 14:11:31.986Z" servicePack="0" sessionTimeOut="86400" useVault="false"/>
                    <userInfo datakitInDatabase="true" homeDir="" instanceLocale="en" locale="en" login="admin" loginCS="Administrator (admin)" loginId="1059" noConsoleCnx="false" orgUnitId="0" theme="" timezone="Europe/Paris">
                        <login-group id="1060"/>
                        <login-right right="admin"/>
                        <installed-package name="campaign" namespace="nms"/>
                        <installed-package name="core" namespace="nms"/>
                    </userInfo>
                </sessionInfo>
            </pSessionInfo>
            <pstrSecurityToken xsi:type='xsd:string'>@$security_token$==</pstrSecurityToken>
        </LogonResponse>
    </SOAP-ENV:Body>
    </SOAP-ENV:Envelope>`);

    const BEARER_LOGON_RESPONSE = Promise.resolve(`<?xml version='1.0'?>
    <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:xtk:session' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
    <SOAP-ENV:Body>
        <BearerTokenLogonResponse xmlns='urn:xtk:session' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
            <pstrSessionToken xsi:type='xsd:string'>___$session_token$</pstrSessionToken>
            <pSessionInfo xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
            <sessionInfo>
                <serverInfo advisedClientBuildNumber="0" allowSQL="false" buildNumber="9219" commitId="f5f3ec3" databaseId="uFE80000000000000F1FA913DD7CC7C480041161C" defaultNameSpace="cus" fohVersion="2" instanceName="ffdamkt" majNumber="6" minClientBuildNumber="8969" minNumber="7" minNumberTechnical="0" releaseName="20.3" securityTimeOut="86400" serverDate="2020-07-05 14:11:31.986Z" servicePack="0" sessionTimeOut="86400" useVault="false"/>
                    <userInfo datakitInDatabase="true" homeDir="" instanceLocale="en" locale="en" login="admin" loginCS="Administrator (admin)" loginId="1059" noConsoleCnx="false" orgUnitId="0" theme="" timezone="Europe/Paris">
                        <login-group id="1060"/>
                        <login-right right="admin"/>
                        <installed-package name="campaign" namespace="nms"/>
                        <installed-package name="core" namespace="nms"/>
                    </userInfo>
                </sessionInfo>
            </pSessionInfo>
            <pstrSecurityToken xsi:type='xsd:string'>@$security_token$==</pstrSecurityToken>
        </BearerTokenLogonResponse>
    </SOAP-ENV:Body>
    </SOAP-ENV:Envelope>`);

const LOGON_RESPONSE_NO_USERINFO = Promise.resolve(`<?xml version='1.0'?>
    <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:xtk:session' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
    <SOAP-ENV:Body>
        <LogonResponse xmlns='urn:xtk:session' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
            <pstrSessionToken xsi:type='xsd:string'>___C8B4A541-48DC-4C97-95AD-066930FD3892</pstrSessionToken>
            <pSessionInfo xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
            <sessionInfo>
                <serverInfo advisedClientBuildNumber="0" allowSQL="false" buildNumber="9219" commitId="f5f3ec3" databaseId="uFE80000000000000F1FA913DD7CC7C480041161C" defaultNameSpace="cus" fohVersion="2" instanceName="ffdamkt" majNumber="6" minClientBuildNumber="8969" minNumber="7" minNumberTechnical="0" releaseName="20.3" securityTimeOut="86400" serverDate="2020-07-05 14:11:31.986Z" servicePack="0" sessionTimeOut="86400" useVault="false"/>
                </sessionInfo>
            </pSessionInfo>
            <pstrSecurityToken xsi:type='xsd:string'>@mMBSMLXIpQd56agsZ5X7OGXWz8Q476qMq6FimwqCdT1wByRDq3pQtaYSY4uJnAbCgXIvpXA5TrxHu-3YjUad5g==</pstrSecurityToken>
        </LogonResponse>
    </SOAP-ENV:Body>
    </SOAP-ENV:Envelope>`);

const LOGON_RESPONSE_NO_SESSIONTOKEN = Promise.resolve(`<?xml version='1.0'?>
    <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:xtk:session' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
    <SOAP-ENV:Body>
        <LogonResponse xmlns='urn:xtk:session' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
            <pstrSessionToken xsi:type='xsd:string'></pstrSessionToken>
            <pSessionInfo xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
            <sessionInfo>
                <serverInfo advisedClientBuildNumber="0" allowSQL="false" buildNumber="9219" commitId="f5f3ec3" databaseId="uFE80000000000000F1FA913DD7CC7C480041161C" defaultNameSpace="cus" fohVersion="2" instanceName="ffdamkt" majNumber="6" minClientBuildNumber="8969" minNumber="7" minNumberTechnical="0" releaseName="20.3" securityTimeOut="86400" serverDate="2020-07-05 14:11:31.986Z" servicePack="0" sessionTimeOut="86400" useVault="false"/>
                    <userInfo datakitInDatabase="true" homeDir="" instanceLocale="en" locale="en" login="admin" loginCS="Administrator (admin)" loginId="1059" noConsoleCnx="false" orgUnitId="0" theme="" timezone="Europe/Paris">
                        <login-group id="1060"/>
                        <login-right right="admin"/>
                        <installed-package name="campaign" namespace="nms"/>
                        <installed-package name="core" namespace="nms"/>
                    </userInfo>
                </sessionInfo>
            </pSessionInfo>
            <pstrSecurityToken xsi:type='xsd:string'>@mMBSMLXIpQd56agsZ5X7OGXWz8Q476qMq6FimwqCdT1wByRDq3pQtaYSY4uJnAbCgXIvpXA5TrxHu-3YjUad5g==</pstrSecurityToken>
        </LogonResponse>
    </SOAP-ENV:Body>
    </SOAP-ENV:Envelope>`);

const LOGON_RESPONSE_NO_SECURITYTOKEN = Promise.resolve(`<?xml version='1.0'?>
    <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:xtk:session' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
    <SOAP-ENV:Body>
        <LogonResponse xmlns='urn:xtk:session' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
            <pstrSessionToken xsi:type='xsd:string'>___C8B4A541-48DC-4C97-95AD-066930FD3892</pstrSessionToken>
            <pSessionInfo xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
            <sessionInfo>
                <serverInfo advisedClientBuildNumber="0" allowSQL="false" buildNumber="9219" commitId="f5f3ec3" databaseId="uFE80000000000000F1FA913DD7CC7C480041161C" defaultNameSpace="cus" fohVersion="2" instanceName="ffdamkt" majNumber="6" minClientBuildNumber="8969" minNumber="7" minNumberTechnical="0" releaseName="20.3" securityTimeOut="86400" serverDate="2020-07-05 14:11:31.986Z" servicePack="0" sessionTimeOut="86400" useVault="false"/>
                    <userInfo datakitInDatabase="true" homeDir="" instanceLocale="en" locale="en" login="admin" loginCS="Administrator (admin)" loginId="1059" noConsoleCnx="false" orgUnitId="0" theme="" timezone="Europe/Paris">
                        <login-group id="1060"/>
                        <login-right right="admin"/>
                        <installed-package name="campaign" namespace="nms"/>
                        <installed-package name="core" namespace="nms"/>
                    </userInfo>
                </sessionInfo>
            </pSessionInfo>
            <pstrSecurityToken xsi:type='xsd:string'></pstrSecurityToken>
        </LogonResponse>
    </SOAP-ENV:Body>
    </SOAP-ENV:Envelope>`);

const LOGOFF_RESPONSE = Promise.resolve(`<?xml version='1.0'?>
    <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:xtk:session' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
    <SOAP-ENV:Body>
        <LogoffResponse xmlns='urn:xtk:session' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
        </LogoffResponse>
    </SOAP-ENV:Body>
    </SOAP-ENV:Envelope>`);

const GET_XTK_SESSION_SCHEMA_RESPONSE = Promise.resolve(`<?xml version='1.0'?>
    <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:wpp:default' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
    <SOAP-ENV:Body>
        <GetEntityIfMoreRecentResponse xmlns='urn:wpp:default' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
            <pdomDoc xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
            <schema namespace="xtk" name="session" implements="xtk:persist">
                <interface name="persist">
                    <method name="Write" static="true">
                        <parameters>
                            <param name="doc" type="DOMDocument"/>
                        </parameters>
                    </method>
                    <method name="GetDocument" static="true">
                        <parameters>
                            <param inout="out" name="doc" type="DOMDocument"/>
                        </parameters>
                    </method>
                    <method name="GetElement" static="true">
                        <parameters>
                            <param inout="out" name="doc" type="DOMElement"/>
                        </parameters>
                    </method>
                    <method name="SetDocument" static="true">
                        <parameters>
                            <param name="doc" type="DOMDocument"/>
                        </parameters>
                    </method>
                    <method name="SetElement" static="true">
                        <parameters>
                            <param name="doc" type="DOMElement"/>
                        </parameters>
                    </method>
                </interface>
                <element name="sessionInfo"/>
                <element name="userInfo" label="Parameters" desc="Information on current session">
                    <attribute name="loginId" type="long"/>
                </element>
                <element name="session"></element>
                <methods>
                    <method name="GetOption" static="true">
                        <parameters>
                            <param name="name" type="string"/>
                            <param inout="out" name="value" type="string"/> 
                            <param inout="out" name="type" type="byte"/>
                        </parameters>
                    </method> 
                    <method name="GetUserInfo" static="true">
                        <parameters>
                            <param name="userInfo" type="sessionUserInfo" inout="out"/>
                        </parameters>
                    </method>
                    <method name="NonStatic"></method>
                    <method name="TestCnx" static="true"></method>
                    <method name="NonStaticP1">
                        <parameters>
                            <param name="name" type="string"/>
                        </parameters>
                    </method>
                    <method name="StaticP1" static="true">
                        <parameters>
                            <param name="name" type="string"/>
                        </parameters>
                    </method>
                </methods>
            </schema>
            </pdomDoc>
        </GetEntityIfMoreRecentResponse>
    </SOAP-ENV:Body>
    </SOAP-ENV:Envelope>`)

const GET_DATABASEID_RESPONSE = Promise.resolve(`<?xml version='1.0'?>
    <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:xtk:session' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
    <SOAP-ENV:Body>
        <GetOptionResponse xmlns='urn:xtk:session' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
            <pstrValue xsi:type='xsd:string'>uFE80000000000000F1FA913DD7CC7C480041161C</pstrValue>
            <pbtType xsi:type='xsd:byte'>6</pbtType>
        </GetOptionResponse>
    </SOAP-ENV:Body>
    </SOAP-ENV:Envelope>`);

const GET_OPTION_NOTFOUND_RESPONSE = Promise.resolve(`<?xml version='1.0'?>
    <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:xtk:session' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
    <SOAP-ENV:Body>
        <GetOptionResponse xmlns='urn:xtk:session' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
            <pstrValue xsi:type='xsd:string'></pstrValue>
            <pbtType xsi:type='xsd:byte'>0</pbtType>
        </GetOptionResponse>
    </SOAP-ENV:Body>
    </SOAP-ENV:Envelope>`);

// forged getOption response where the resulting values are missinf
const GET_OPTION_MISSING_DATA_RESPONSE = Promise.resolve(`<?xml version='1.0'?>
    <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:xtk:session' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
    <SOAP-ENV:Body>
        <GetOptionResponse xmlns='urn:xtk:session' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
        </GetOptionResponse>
    </SOAP-ENV:Body>
    </SOAP-ENV:Envelope>`);

const GET_XTK_QUERY_SCHEMA_RESPONSE = Promise.resolve(`<?xml version='1.0'?>
    <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:wpp:default' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
    <SOAP-ENV:Body>
        <GetEntityIfMoreRecentResponse xmlns='urn:wpp:default' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
            <pdomDoc xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
                <schema name="queryDef" namespace="xtk">
                    <element name="queryDef"></element>
                    <methods>
                        <method const="true" name="ExecuteQuery">
                            <parameters>
                                <param desc="Output XML document" inout="out" name="output" type="DOMDocument"/>
                            </parameters> 
                        </method>
                        <method name="SelectAll">
                            <parameters>
                              <param desc="Specifies whether we are duplicating, in which case adds all OwnCopy elements." name="duplicate" type="boolean" inout="in"/>
                            </parameters>
                      </method>
                    </methods>
                </schema>
            </pdomDoc>
        </GetEntityIfMoreRecentResponse>
    </SOAP-ENV:Body>
    </SOAP-ENV:Envelope>`);

const GET_MID_EXT_ACCOUNT_RESPONSE = (encryptedPassword) => {
    return  Promise.resolve(`<?xml version='1.0'?>
    <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:xtk:queryDef' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
    <SOAP-ENV:Body>
        <ExecuteQueryResponse xmlns='urn:xtk:queryDef' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
            <pdomOutput xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
                <extAccount account="mid" id="2088" name="defaultEmailMid" password="${encryptedPassword}" server="http://ffdamid:8080" type="3"/>
            </pdomOutput>
        </ExecuteQueryResponse>
    </SOAP-ENV:Body>
    </SOAP-ENV:Envelope>`);
}

const GET_BAD_EXT_ACCOUNT_RESPONSE = (encryptedPassword) => {
    return Promise.resolve(`<?xml version='1.0'?>
    <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:xtk:queryDef' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
    <SOAP-ENV:Body>
        <ExecuteQueryResponse xmlns='urn:xtk:queryDef' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
            <pdomOutput xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
                <extAccount account="bad" id="2088" name="bad" password="${encryptedPassword}" server="http://zz:8080" type="999"/>
            </pdomOutput>
        </ExecuteQueryResponse>
    </SOAP-ENV:Body>
    </SOAP-ENV:Envelope>`);
}

const GET_SECRET_KEY_OPTION_RESPONSE = (key) => {
    return Promise.resolve(`<?xml version='1.0'?>
    <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:xtk:session' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
    <SOAP-ENV:Body>
        <GetOptionResponse xmlns='urn:xtk:session' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
            <pstrValue xsi:type='xsd:string'>${key}</pstrValue>
            <pbtType xsi:type='xsd:byte'>6</pbtType>
        </GetOptionResponse>
    </SOAP-ENV:Body>
    </SOAP-ENV:Envelope>`);
}

const GET_LOGON_MID_RESPONSE = Promise.resolve(`<?xml version='1.0'?>
    <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:xtk:session' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
    <SOAP-ENV:Body>
        <LogonResponse xmlns='urn:xtk:session' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
            <pstrSessionToken xsi:type='xsd:string'>___46FCE345-D052-4DF3-B659-C794CA98B9AA</pstrSessionToken>
            <pSessionInfo xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
            <sessionInfo>
                <serverInfo advisedClientBuildNumber="0" allowSQL="false" buildNumber="9219" commitId="f5f3ec3" databaseId="uFE80000000000000F1FA913DD7CC7C480CC4AAEE" defaultNameSpace="cus" fohVersion="2" instanceName="ffdamid" majNumber="6" minClientBuildNumber="8969" minNumber="7" minNumberTechnical="0" releaseName="20.3" securityTimeOut="86400" serverDate="2020-07-05 15:09:23.320Z" servicePack="0" sessionTimeOut="86400" useVault="false"/>
                <userInfo login="mid" loginCS="Mid" loginId="1234"></userInfo>
            </sessionInfo>
            </pSessionInfo>
            <pstrSecurityToken xsi:type='xsd:string'>@ZqisVeI1MYcIYZUso5mcI6Q77KDrRIFuYDjvZ4FMEWJqygmN6P23vns46ayOg-nAofiSyzVbvCFcnXOmwKg1Kw==</pstrSecurityToken>
        </LogonResponse>
    </SOAP-ENV:Body>
    </SOAP-ENV:Envelope>`);

const GET_TSTCNX_RESPONSE = Promise.resolve(`<?xml version='1.0'?>
    <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:xtk:session' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
    <SOAP-ENV:Body>
        <TestCnxResponse xmlns='urn:xtk:session' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
        </TestCnxResponse>
    </SOAP-ENV:Body>
    </SOAP-ENV:Envelope>`);

const GET_NMS_EXTACCOUNT_SCHEMA_RESPONSE = Promise.resolve(`<?xml version='1.0'?>
    <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:wpp:default' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
    <SOAP-ENV:Body>
        <GetEntityIfMoreRecentResponse xmlns='urn:wpp:default' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
            <pdomDoc xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
                <schema name="extAccount" namespace="nms" xtkschema="xtk:schema">
                    <enumeration basetype="byte" default="delivery" name="type">
                        <value name="bounces" value="0"/>
                        <value name="hdfs" value="17"/>
                    </enumeration>
                    <enumeration basetype="byte" default="none" name="encryptionType">
                        <value name="none" value="0"/>
                        <value name="ssl" value="1"/>
                    </enumeration>
                    <element name="extAccount"></element>
                </schema>
            </pdomDoc>
        </GetEntityIfMoreRecentResponse>
    </SOAP-ENV:Body>
    </SOAP-ENV:Envelope>`);

const GET_XTK_ALL_SCHEMA_RESPONSE = Promise.resolve(`<?xml version='1.0'?>
    <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:wpp:default' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
    <SOAP-ENV:Body>
        <GetEntityIfMoreRecentResponse xmlns='urn:wpp:default' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
            <pdomDoc xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
                <schema name="all" namespace="xtk" xtkschema="xtk:schema">
                    <element name="all"></element>
                    <methods>
                        <method name="AllTypes" static="true">
                            <parameters>
                            <param inout="in" name="string" type="string"/>
                            <param inout="in" name="boolean" type="boolean"/>
                            <param inout="in" name="byte" type="byte"/>
                            <param inout="in" name="short" type="short"/>
                            <param inout="in" name="long" type="long"/>
                            <param inout="in" name="int64" type="int64"/>
                            <param inout="in" name="datetime" type="datetime"/>
                            <param inout="in" name="date" type="date"/>
                            <param inout="out" name="string" type="string"/>
                            <param inout="out" name="boolean" type="boolean"/>
                            <param inout="out" name="byte" type="byte"/>
                            <param inout="out" name="short" type="short"/>
                            <param inout="out" name="long" type="long"/>
                            <param inout="out" name="int64" type="int64"/>
                            <param inout="out" name="datetime" type="datetime"/>
                            <param inout="out" name="date" type="date"/>
                            <param inout="in" name="element" type="DOMElement"/>
                            <param inout="out" name="element" type="DOMElement"/>
                            <param inout="in" name="element" type="DOMDocument"/>
                            <param inout="out" name="element" type="DOMDocument"/>
                            </parameters> 
                        </method>
                        <method name="Unsupported" static="true">
                            <parameters>
                            <param inout="out" name="unsupported" type="unsupported"/>
                            </parameters> 
                        </method>
                        <method name="UnsupportedInput" static="true">
                            <parameters>
                            <param inout="in" name="unsupported" type="unsupported"/>
                            </parameters> 
                        </method>
                    </methods>
                </schema>
            </pdomDoc>
        </GetEntityIfMoreRecentResponse>
    </SOAP-ENV:Body>
    </SOAP-ENV:Envelope>`);

const GET_XTK_ALL_TYPES_RESPONSE = Promise.resolve(`<?xml version='1.0'?>
    <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:wpp:default' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
    <SOAP-ENV:Body>
        <AllTypesResponse xmlns='urn:wpp:default' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
            <dummy xsi:type='xsd:string'>Hello World</dummy>
            <dummy xsi:type='xsd:boolean'>true</dummy>
            <dummy xsi:type='xsd:byte'>1</dummy>
            <dummy xsi:type='xsd:short'>1000</dummy>
            <dummy xsi:type='xsd:int'>100000</dummy>
            <dummy xsi:type='xsd:long'>100000</dummy>
            <dummy xsi:type='xsd:dateTime'>2020-12-31T12:34:56.789Z</dummy>
            <dummy xsi:type='xsd:date'>2020-12-31</dummy>
            <dummy xsi:type='ns:Element'><root type='element' result='true'/></dummy>
            <dummy xsi:type=''><root type='document' result='true'/></dummy>
        </AllTypesResponse>
    </SOAP-ENV:Body>
    </SOAP-ENV:Envelope>`);

const GET_XTK_TYPE_UNSUPPORTED_TYPE_RESPONSE = Promise.resolve(`<?xml version='1.0'?>
    <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:wpp:default' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
    <SOAP-ENV:Body>
        <Unsupported xmlns='urn:wpp:default' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
            <dummy xsi:type='unsupported'>Hello World</dummy>
        </Unsupported>
    </SOAP-ENV:Body>
    </SOAP-ENV:Envelope>`);


const GET_USER_INFO_RESPONSE = Promise.resolve(`<?xml version='1.0'?>
    <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:wpp:default' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
    <SOAP-ENV:Body>
    <GetUserInfoResponse xmlns='urn:xtk:session' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
        <pUserInfo xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
            <userInfo datakitInDatabase="true" homeDir="" instanceLocale="en" locale="en" login="admin" loginCS="Administrator (admin)" loginId="1059" noConsoleCnx="false" orgUnitId="0" theme="" timezone="Europe/Paris">
                <login-group id="1060"/>
                <login-right right="admin"/>
            </userInfo>
        </pUserInfo>
    </GetUserInfoResponse>
    </SOAP-ENV:Body>
    </SOAP-ENV:Envelope>`);

const GET_MISSING_SCHEMA_RESPONSE = Promise.resolve(`<?xml version='1.0'?>
    <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:wpp:default' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
    <SOAP-ENV:Body>
        <GetEntityIfMoreRecentResponse xmlns='urn:wpp:default' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
            <pdomDoc xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
            </pdomDoc>
        </GetEntityIfMoreRecentResponse>
    </SOAP-ENV:Body>
    </SOAP-ENV:Envelope>`);

const GET_XTK_WORKFLOW_SCHEMA_RESPONSE = Promise.resolve(`<?xml version='1.0'?>
    <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:wpp:default' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
    <SOAP-ENV:Body>
        <GetEntityIfMoreRecentResponse xmlns='urn:wpp:default' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
            <pdomDoc xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
            <schema namespace="xtk" name="workflow">
                <element name="workflow"></element>
                <methods>
                    <method name="StartWithParameters" static="true">
                        <parameters>
                            <param name="workflowId" type="string" inout="in" />
                            <param name="parameters" type="DOMElement" inout="in"></param>
                        </parameters>
                    </method>
                </methods>
            </schema>
            </pdomDoc>
        </GetEntityIfMoreRecentResponse>
    </SOAP-ENV:Body>
    </SOAP-ENV:Envelope>`);

const GET_NMS_RTEVENT_SCHEMA_RESPONSE = Promise.resolve(`<?xml version='1.0'?>
<SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:wpp:default' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
<SOAP-ENV:Body>
    <GetEntityIfMoreRecentResponse xmlns='urn:wpp:default' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
        <pdomDoc xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
        <schema namespace="nms" name="rtEvent">
            <element name="rtEvent"></element>
            <methods>
                <method name="PushEvent" static="true">
                    <parameters>
                        <param desc="Event." inout="in" name="event" type="DOMDocument"/>
                        <param desc="Technical identifier of the inserted event" inout="out" name="id" type="int64"/>
                    </parameters>
                </method>      
            </methods>
        </schema>
        </pdomDoc>
    </GetEntityIfMoreRecentResponse>
</SOAP-ENV:Body>
</SOAP-ENV:Envelope>`);

const GET_QUERY_EXECUTE_RESPONSE = Promise.resolve(`<?xml version='1.0'?>
    <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:xtk:queryDef' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
    <SOAP-ENV:Body>
    <ExecuteQueryResponse xmlns='urn:xtk:queryDef' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
        <pdomOutput xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
        <extAccount-collection>
            <extAccount id="1816" name="defaultPopAccount"/>
            <extAccount id="1818" name="defaultOther"/>
            <extAccount id="1849" name="billingReport"/>
            <extAccount id="12070" name="TST_EXT_ACCOUNT_POSTGRESQL"/>
            <extAccount id="1817" name="defaultEmailBulk"/>
            <extAccount id="2087" name="ffda"/>
            <extAccount id="2088" name="defaultEmailMid"/>
        </extAccount-collection>
        </pdomOutput></ExecuteQueryResponse>
    </SOAP-ENV:Body>
    </SOAP-ENV:Envelope>`);

const GET_GETDOCUMENT_RESPONSE = Promise.resolve(`<?xml version='1.0'?>
    <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:xtk:persist' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
    <SOAP-ENV:Body>
    <GetDocumentResponse xmlns='urn:xtk:persist' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
        <pdomOutput xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
        </pdomOutput></GetDocumentResponse>
    </SOAP-ENV:Body>
    </SOAP-ENV:Envelope>`);

const GET_GETELEMENT_RESPONSE = Promise.resolve(`<?xml version='1.0'?>
    <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:xtk:persist' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
    <SOAP-ENV:Body>
    <GetElementResponse xmlns='urn:xtk:persist' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
        <pdomOutput xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
        </pdomOutput></GetElementResponse>
    </SOAP-ENV:Body>
    </SOAP-ENV:Envelope>`);


const GET_SETDOCUMENT_RESPONSE = Promise.resolve(`<?xml version='1.0'?>
    <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:xtk:persist' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
    <SOAP-ENV:Body>
    <SetDocumentResponse xmlns='urn:xtk:persist' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
        <pdomOutput xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
        </pdomOutput></SetDocumentResponse>
    </SOAP-ENV:Body>
    </SOAP-ENV:Envelope>`);

const GET_SETELEMENT_RESPONSE = Promise.resolve(`<?xml version='1.0'?>
    <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:xtk:persist' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
    <SOAP-ENV:Body>
    <SetElementResponse xmlns='urn:xtk:persist' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
        <pdomOutput xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
        </pdomOutput></SetElementResponse>
    </SOAP-ENV:Body>
    </SOAP-ENV:Envelope>`);


const GET_GETSCHEMA_HELLO_RESPONSE = Promise.resolve(`<?xml version='1.0'?>
    <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:wpp:default' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
    <SOAP-ENV:Body>
        <GetEntityIfMoreRecentResponse xmlns='urn:wpp:default' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
            <pdomDoc xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
                <schema name="hello" namespace="xtk">
                    <element name="hello"></element>
                    <methods>
                        <method const="true" name="World" static="true">
                            <parameters>
                                <param desc="Output XML document" inout="out" name="output" type="DOMDocument"/>
                            </parameters> 
                        </method>
                    </methods>
                </schema>
            </pdomDoc>
        </GetEntityIfMoreRecentResponse>
    </SOAP-ENV:Body>
    </SOAP-ENV:Envelope>`);

const GET_HELLO_RESPONSE = Promise.resolve(`<?xml version='1.0'?>
    <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:xtk:session' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
    <SOAP-ENV:Body>
        <WorldResponse xmlns='urn:xtk:session' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
            <pdomDoc xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
                <hello world="cruel"/>
            </pdomDoc>
        </WorldResponse>
    </SOAP-ENV:Body>
    </SOAP-ENV:Envelope>`);

const INCREASE_VALUE_RESPONSE = Promise.resolve(`<?xml version='1.0'?>
<SOAP-ENV:Envelope
    xmlns:xsd='http://www.w3.org/2001/XMLSchema'
    xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance'
    xmlns:ns='urn:xtk:counter'
    xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
    <SOAP-ENV:Body>
        <IncreaseValueResponse
            xmlns='urn:xtk:counter' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
            <plValue xsi:type='xsd:int'>1</plValue>
        </IncreaseValueResponse>
    </SOAP-ENV:Body>
</SOAP-ENV:Envelope>

`);

const FILE_RES_WRITE_RESPONSE = Promise.resolve(`<?xml version='1.0'?><SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:wpp:default' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'><SOAP-ENV:Body><GetEntityIfMoreRecentResponse xmlns='urn:wpp:default' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'><pdomDoc xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'><schema _cs="Sessions to the application server (xtk)" created="2022-02-03 12:55:02.621Z" createdBy-id="0" dependingSchemas="" desc="Sessions to the application server" entitySchema="xtk:schema" img="" implements="xtk:persist" label="Sessions to the application server" labelSingular="Session" lastModified="2022-07-11 02:29:30.026Z" library="true" mappingType="xmlFile" md5="9D716FE59E174E87C5BA8A834DD4B11B" modifiedBy-id="0" name="session" namespace="xtk" xtkschema="xtk:schema">

  <interface async="true" label="Persistence" name="persist">
    <method name="NewInstance">
      <help>New document creation, pre-initialized but not saved</help>
    </method>

    <method name="Duplicate">
      <help>Creates a new document from a source document</help>
      <parameters>
        <param desc="Primary key of the source document" name="pk" type="primarykey"/>
      </parameters>
      <example><para>The following example creates a new operator by duplicating the <varname>12345</varname> identifier operator and changing its name and login.</para>
        <programlisting>var operator = xtk.operator.create()     // Create an empty operator
operator.Duplicate("xtk:operator|12345") // Initialize by duplication
operator.name = "newLogin"       // Customize
operator.label = "newUserDesc"
operator.save()                          // Save
 </programlisting>
      </example>
    </method>

    <method name="DuplicateWithMappingId">
      <help>Duplicates a new document from the source document with the ID mapping</help>
      <parameters>
        <param desc="Primary key of the source document" name="pk" type="primarykey"/>
        <param desc="ID mapping" inout="out" name="mapping" type="DOMElement"/>
      </parameters>
    </method>

    <method name="DuplicateTo">
      <help>Duplicates a new document from a source document to a given folder</help>
      <parameters>
        <param desc="Primary key of the source document" name="pk" type="primarykey"/>
        <param desc="Primary key of the destination folder" name="folder" type="primarykey"/>
      </parameters>
    </method>

    <method name="ApplyDuplicateRules">
      <help>Applies the duplication settings (including default values) to the specified document</help>
    </method>

    <method name="SetDefaults">
      <help>Set default values</help>
    </method>
    <method name="SetDefaultValues">
      <help>Fix values by default based on xpath</help>
      <parameters>
        <param desc="XPath" name="xpath" type="string"/>
      </parameters>
    </method>
    <method name="Load">
      <help>Load the entity</help>
      <parameters>
        <param desc="Primary key" name="pk" type="primarykey"/>
      </parameters>
    </method>
    <method name="LoadIfExists">
      <help>Load the entity if it exists</help>
      <parameters>
        <param desc="Primary key" name="pk" type="primarykey"/>
        <param desc="Shows if entity exists" inout="out" name="Exists" type="boolean"/>
      </parameters>
    </method>
    <method name="LoadAsText" static="true">
      <help>Retrieve entity contents as text</help>
      <parameters>
        <param desc="Primary key" name="pk" type="primarykey"/>
        <param desc="Entity content" inout="out" name="Content" type="string"/>
      </parameters>
    </method>
    <method hidden="true" name="Store">  <!-- ## innefficient -->
      <help>Save entity</help>
    </method>
    <method name="Remove" pkonly="true">
      <help>Delete entity</help>
    </method>
    <method const="true" name="GetPkList" pkonly="true"> <!-- ## should be const, but then schema is lost -->
      <help>Get the list of instance identifiers</help>
      <parameters>
        <param desc="Primary keys" inout="out" name="pkList" type="primarykeylist"/>
      </parameters>
    </method>

    <method name="Write" static="true">
      <help>Update an entity</help>
      <parameters>
        <param desc="Document of difference" name="doc" type="DOMDocument"/>
      </parameters>
      <example><para>A simple recipient creation:</para>
    \t  <programlisting>
xtk.session.Write(
    {recipient: {xtkschema: "nms:recipient", firstName: "Raul", lastName: "Endymion"}})
      \t</programlisting>
      </example>
    </method>

    <method name="Ingest" static="true">
      <help>Insert a staging entity only. Return UUID primary key values if present.</help>
      <parameters>
        <param desc="New document to be inserted." name="doc" type="DOMDocument"/>
        <param desc="UUID values result." inout="out" name="sUuids" type="string"/>
      </parameters>
      <example><para>A simple staging recipient creation:</para>
        <programlisting>
strUuid = xtk.session.Ingest(
          {recipient: {xtkschema: "nms:recipientStg", firstName: "Raul", lastName: "Endymion"}})
        </programlisting>
      </example>
    </method>

    <method name="IngestExt" static="true">
      <help>Update a staging entity.</help>
      <parameters>
        <param desc="Document to be inserted or updated." name="doc" type="DOMDocument"/>
      </parameters>
      <example><para>A simple staging recipient creation:</para>
        <programlisting>
xtk.session.IngestExt(
    {recipient: {xtkschema: "nms:recipientStg", firstName: "Raul", lastName: "Endymion"}})
        </programlisting>
      </example>
    </method>

    <method name="WriteCollection" static="true">
      <help>Update a list of entities</help>
      <parameters>
        <param desc="Document of differences gathering" name="doc" type="DOMDocument"/>
      </parameters>
    </method>
    <method name="DeleteCollection" static="true">
      <help>Delete a list of entities based on a condition</help>
      <parameters>
        <param desc="Entity schema" name="schema" type="string"/>
        <param desc="Delete condition" name="where" type="DOMElement"/>
        <param desc="Ignore deleteStatus" name="ignoreDeleteStatus" type="boolean"/>
      </parameters>
    </method>
    <method name="ImportCollection" static="true">
      <help>Update a list of entities using an import</help>
      <parameters>
        <param desc="Data document" name="doc" type="DOMDocument"/>
      </parameters>
    </method>

    <method name="GetImages" static="true">
      <help>Load a list of images</help>
      <parameters>
        <param desc="Primary keys" name="pkList" type="string"/>
        <param desc="Result" inout="out" name="doc" type="DOMDocument"/>
      </parameters>
    </method>

    <method name="GetEntityIfMoreRecent" static="true">
      <help>Load an entity if its MD5 key is different than the one given as a parameter</help>
      <parameters>
        <param desc="Primary key" name="pk" type="string"/>
        <param desc="MD5 key" name="md5" type="string"/>
        <param desc="Result" inout="out" name="doc" type="DOMDocument"/>
        <param name="mustExist" type="boolean"/>
      </parameters>
    </method>

    <method name="GetDirtyCacheEntities" static="true">
      <help>Return dirty cached entities</help>
      <parameters>
        <param desc="List of cached entities" name="cacheEntities" type="DOMDocument"/>
        <param desc="List of dirty entities" inout="out" name="dirtyEntities" type="DOMDocument"/>
      </parameters>
    </method>

    <method name="GetActiveApplicationMenus" static="true">
      <help>Returns a document containing the menus of the applications enabled for the current login</help>
      <parameters>
        <param desc="Result" inout="out" name="doc" type="DOMDocument"/>
      </parameters>
    </method>

    <method name="GetDefaultEntity" static="true">
      <help>Returns a document containing an empty entity with its default values</help>
      <parameters>
        <param desc="Entity schema" name="schema" type="string"/>
        <param desc="Result" inout="out" name="doc" type="DOMDocument"/>
      </parameters>
    </method>
  </interface>

  <element desc="Information on server version" label="Version" name="serverInfo">
    <attribute desc="Major version number" label="Major number" name="majNumber" type="short"/>
    <attribute desc="Minor version number" label="Minor number" name="minNumber" type="short"/>
    <attribute label="Service pack number" name="servicePack" type="short"/>
    <attribute desc="Technical minor version number" label="Technical minor version" name="minNumberTechnical" type="short"/>
    <attribute label="Build number" name="buildNumber" type="short"/>
    <attribute desc="Minimum client build number to be compatible with the connected server" label="Minimum client build number" name="minClientBuildNumber" type="short"/>
    <attribute desc="Recommended client build number to be compatible with the connected server" label="Recommended client build number" name="advisedClientBuildNumber" type="short"/>
    <attribute desc="Recommended client version to be compatible with the connected server" label="Recommended client version" name="advisedClientVersion" type="string"/>
    <attribute desc="Recommended client setup file name to be compatible with the connected server" label="Recommended client setup file name" name="advisedClientName" type="string"/>
    <attribute desc="Server build release name" label="Release Name" name="releaseName" type="string"/>
    <attribute desc="Server build commit identifier" label="Commit ID" name="commitId" type="string"/>
    <attribute desc="Default namespace used when creating a new entity" label="Default namespace" name="defaultNameSpace" type="string"/>
    <attribute desc="GMT time of server" label="Server date" name="serverDate" type="datetime"/>
    <attribute desc="Identifier of database" label="Database identifier" name="databaseId" type="string"/>
    <attribute desc="Wizard to launch when connecting" label="Wizard to launch" name="wizardToLaunch" type="string"/>
    <attribute label="Instance name" name="instanceName" type="string"/>
    <attribute label="Duration before sessions expire." name="sessionTimeOut" type="timespan"/>
    <attribute label="Security token validity period" name="securityTimeOut" type="timespan"/>
    <attribute label="SQLDATA authorized" name="allowSQL" type="boolean"/>
    <attribute label="Secrets are stored in an external service." name="useVault" type="boolean"/>
    <attribute label="Highest available version of FDA over http protocol" name="fohVersion" type="short"/>
  </element>

  <element desc="Information on current session" label="Parameters" name="userInfo">
    <attribute desc="Identifier of session login" label="Id" name="loginId" type="long"/>
    <attribute desc="Compute string of session login" label="Compute string" name="loginCS" type="string"/>
    <attribute desc="Name (login) of the operator connected" label="Name (login)" name="login" type="string"/>
    <attribute desc="Regional parameters used" label="Regional parameters" name="locale" type="string"/>
    <attribute label="Regional settings of the instance" name="instanceLocale" type="string"/>
    <attribute desc="Session login time zone" label="Time zone" name="timezone" type="string"/>
    <attribute label="Save entities in the database" name="datakitInDatabase" type="boolean"/>
    <attribute desc="Graphical appearance (skin, or theme)" label="Theme" name="theme" type="string"/>
    <attribute desc="Access from the client console denied" label="No access using from rich client" name="noConsoleCnx" type="boolean"/>
    <attribute desc="Filter based on folder" label="User root folder" name="homeDir" type="string"/>
    <attribute desc="Identifier of the organizational entity" label="Id" name="orgUnitId" type="long"/>
    <element name="login-group" unbound="true">
      <attribute desc="Identifier of group associated to login" label="Recipient group Id" name="id" type="string"/>
    </element>
    <element name="login-right" unbound="true">
      <attribute desc="Name of the named right associated with login" label="Right" name="right" type="string"/>
    </element>
    <element name="installed-package" unbound="true">
      <attribute desc="Name of the installed package" label="Name" name="name" type="string"/>
      <attribute desc="Namespace of the installed package" label="Namespace" name="namespace" type="string"/>
    </element>
    <!-- Currency removed temporarily
      <element name="currency" unbound="true" ref="xtk:currency:currency" applicableIf="HasPackage('xtk:currency')"/>
     -->
  </element>


  <!-- définition du schéma -->
  <element name="session">
    <key name="nsName">
      <keyfield xpath="@namespace"/>
      <keyfield xpath="@name"/>
    </key><attribute dataPolicy="identifier" default="DefaultNameSpace()" label="Namespace" length="16" name="namespace" required="true" type="string"/><attribute dataPolicy="identifier" default="NewName()" edit="NamePkEdit" label="Name" length="80" name="name" required="true" type="string"/>

    <attribute desc="User account" label="Account" name="login" type="string"/>
    <attribute desc="Connection settings" label="Parameters" name="parameters" type="string"/>

    <element name="info">
      <!-- Server parameters -->
      <element name="serverInfo" ref="serverInfo"/>

      <!-- User config -->
      <element name="userInfo" ref="userInfo"/>
    </element>

  </element>

  <methods>
    <method access="anonymous" name="Logon" static="true">
      <help>Opens a session</help>
      <parameters>
        <param desc="User account" name="login" type="string"/>
        <param desc="Password associated with user login" name="password" type="string"/>
        <param desc="Connection settings" name="parameters" type="DOMElement"/>
        <param desc="Session token" inout="out" name="sessionToken" type="string"/>
        <param desc="Session parameters" inout="out" name="sessionInfo" namespace="session" type="sessionInfo"/>
        <param desc="Security token" inout="out" name="securityToken" optional="true" type="string"/>
      </parameters>
    </method>
    <method access="anonymous" name="BearerTokenLogon" static="true">
      <help>connection token</help>
      <parameters>
        <param desc="token" name="bearerToken" type="string"/>
        <param desc="Session token" inout="out" name="sessionToken" type="string"/>
        <param desc="Session parameters" inout="out" name="sessionInfo" namespace="session" type="sessionInfo"/>
        <param desc="Security token" inout="out" name="securityToken" optional="true" type="string"/>
      </parameters>
    </method>

    <method access="anonymous" name="GetUserInfo" static="true">
      <help>Information about current operator</help>
      <parameters>
        <param desc="User parameters" inout="out" name="userInfo" type="sessionUserInfo"/>
      </parameters>
    </method>

    <method name="Logoff" static="true">
      <help>Close current session</help>
    </method>

    <method access="admin" name="KillSession" static="true">
      <help>Closes the session specified</help>
      <parameters>
        <param desc="Login or session ID" name="Id" type="string"/>
      </parameters>
    </method>

    <method access="admin" name="ClearUserContextCache" static="true">
      <help>Clears the session user context cache</help>
    </method>

    <method name="TestCnx" static="true">
      <help>Test the connection.</help>
    </method>

    <method name="ChangePassword" static="true">
      <help>Change current password</help>
      <parameters>
        <param desc="Old password" name="oldPassword" type="string"/>
        <param desc="New password" name="newPassword" type="string"/>
      </parameters>
    </method>

    <method access="anonymous" name="GetServerTime" static="true">
      <help>Returns the server date and time</help>
      <parameters>
        <param inout="out" name="serverTime" type="datetime"/>
      </parameters>
    </method>

    <method access="admin" name="ServerShutdown" static="true">
      <help>Requests server shutdown</help>
    </method>

    <method name="GetOption" static="true">
      <help>Returns the value of an option stored in the database.</help>
      <parameters>
        <param label="Option name" name="name" type="string"/>
        <param desc="Option value as a string" inout="out" label="Option value" name="value" type="string"/>
        <param inout="out" label="Data type" name="type" type="byte"/>
      </parameters>
    </method>

    <method name="GetNewIds" static="true">
      <help>Gathers a list of internal keys identifiers for the database.</help>
      <parameters>
        <param desc="Number of identifiers that this method should return" inout="in" label="Number of identifiers" name="count" type="long"/>
        <param desc="Comma separated list of identifiers" inout="out" label="List of identifiers" name="idList" type="string"/>
      </parameters>
    </method>

    <method name="GetNewIdsEx" static="true">
      <help>Get a list of unique identifiers from the database, given a sequence name.</help>
      <parameters>
        <param desc="Number of identifiers that this method should return" inout="in" label="Number of identifiers" name="count" type="long"/>
        <param desc="Name of the sequence to increment" inout="in" label="Sequence name" name="sequence" type="string"/>
        <param desc="Comma separated list of identifiers" inout="out" label="List of identifiers" name="idList" type="string"/>
      </parameters>
    </method>

    <method access="conditionalAdmin" name="GetCnxInfo" static="true">
      <help>Recovers information from the current connections.</help>
      <parameters>
        <param desc="Returned document" inout="out" name="cnxInfo" type="DOMDocument"/>
      </parameters>
    </method>

    <method access="anonymous" name="FormatDataPolicy" static="true">
      <help>Applies a transformation to the character string according to the data policy passed as a parameter. Leaves the string unchanged in case of failure.</help>
      <parameters>
        <param inout="in" label="Name of the data policy to apply" name="dataPolicy" type="string"/>
        <param inout="in" label="Value to transform" name="value" type="string"/>
        <param inout="out" label="Result of the application of the data policy" name="result" type="string"/>
      </parameters>
    </method>

    <method name="Encrypt" static="true">
      <help>Encrypts the character string with the instance key.</help>
      <parameters>
        <param inout="in" label="Text to encrypt" name="decrypted" type="string"/>
        <param inout="out" label="Encrypted text" name="encrypted" type="string"/>
      </parameters>
    </method>

    <method name="ReEncryptPassword" static="true">
      <help>Re-encrypts a password with the secret key.</help>
      <parameters>
        <param inout="in" label="Password encrypted with the old key" name="oldPassword" type="string"/>
        <param inout="out" label="Password encrypted with the secret key" name="newPassword" type="string"/>
      </parameters>
    </method>

    <method name="EncryptPassword" static="true">
      <help>Encrypts the character string with the secret key.</help>
      <parameters>
        <param inout="in" label="Text to encrypt" name="decrypted" type="string"/>
        <param inout="out" label="Encrypted text" name="encrypted" type="string"/>
      </parameters>
    </method>

    <method name="EncryptServerPassword" static="true">
      <help>Encrypts the character string with the server key.</help>
      <parameters>
        <param inout="in" label="Text to encrypt" name="decrypted" type="string"/>
        <param inout="out" label="Encrypted text" name="encrypted" type="string"/>
      </parameters>
    </method>

    <method name="HashPassword" static="true">
      <help>Hash a password with the server key.</help>
      <parameters>
        <param inout="in" label="Password to encrypt" name="decrypted" type="string"/>
        <param inout="out" label="Encrypted password" name="encrypted" type="string"/>
      </parameters>
    </method>

    <method name="Diff" static="true">
      <help>Returns the current version and the original version of a document.</help>
      <parameters>
        <param desc="Primary key of the document" inout="in" name="pk" type="primarykey"/>
        <param inout="out" label="The original document in text format" name="original" type="string"/>
        <param inout="out" label="The current document in text format" name="current" type="string"/>
      </parameters>
    </method>

    <method access="admin" name="GetTAClientId" static="true">
      <help>Returns the Adobe IO Technical Account Client Id.</help>
      <parameters>
        <param inout="out" label="Unique Client Id" name="clientId" type="string"/>
      </parameters>
    </method>

  </methods>

</schema></pdomDoc></GetEntityIfMoreRecentResponse></SOAP-ENV:Body></SOAP-ENV:Envelope>

`);




// Public exports
exports.Mock = {
  makeClient: makeClient,
  makeAnonymousClient: makeAnonymousClient,
  withMockConsole: withMockConsole,
  makeKey: makeKey,
  R_TEST: R_TEST,
  PING: PING,
  MC_PING: MC_PING,
  MC_PING_ERROR: MC_PING_ERROR,
  LOGON_RESPONSE: LOGON_RESPONSE,
  BEARER_LOGON_RESPONSE: BEARER_LOGON_RESPONSE,
  LOGON_RESPONSE_NO_SESSIONTOKEN: LOGON_RESPONSE_NO_SESSIONTOKEN,
  LOGON_RESPONSE_NO_SECURITYTOKEN: LOGON_RESPONSE_NO_SECURITYTOKEN,
  LOGOFF_RESPONSE: LOGOFF_RESPONSE,
  GET_XTK_SESSION_SCHEMA_RESPONSE: GET_XTK_SESSION_SCHEMA_RESPONSE,
  GET_DATABASEID_RESPONSE: GET_DATABASEID_RESPONSE,
  GET_OPTION_NOTFOUND_RESPONSE: GET_OPTION_NOTFOUND_RESPONSE,
  GET_OPTION_MISSING_DATA_RESPONSE: GET_OPTION_MISSING_DATA_RESPONSE,
  GET_XTK_QUERY_SCHEMA_RESPONSE: GET_XTK_QUERY_SCHEMA_RESPONSE,
  GET_MID_EXT_ACCOUNT_RESPONSE: GET_MID_EXT_ACCOUNT_RESPONSE,
  GET_BAD_EXT_ACCOUNT_RESPONSE: GET_BAD_EXT_ACCOUNT_RESPONSE,
  GET_SECRET_KEY_OPTION_RESPONSE: GET_SECRET_KEY_OPTION_RESPONSE,
  GET_LOGON_MID_RESPONSE: GET_LOGON_MID_RESPONSE,
  GET_TSTCNX_RESPONSE: GET_TSTCNX_RESPONSE,
  GET_NMS_EXTACCOUNT_SCHEMA_RESPONSE: GET_NMS_EXTACCOUNT_SCHEMA_RESPONSE,
  GET_XTK_ALL_SCHEMA_RESPONSE: GET_XTK_ALL_SCHEMA_RESPONSE,
  GET_XTK_ALL_TYPES_RESPONSE: GET_XTK_ALL_TYPES_RESPONSE,
  GET_XTK_TYPE_UNSUPPORTED_TYPE_RESPONSE: GET_XTK_TYPE_UNSUPPORTED_TYPE_RESPONSE,
  GET_USER_INFO_RESPONSE: GET_USER_INFO_RESPONSE,
  GET_MISSING_SCHEMA_RESPONSE: GET_MISSING_SCHEMA_RESPONSE,
  GET_XTK_WORKFLOW_SCHEMA_RESPONSE: GET_XTK_WORKFLOW_SCHEMA_RESPONSE,
  GET_NMS_RTEVENT_SCHEMA_RESPONSE: GET_NMS_RTEVENT_SCHEMA_RESPONSE,
  GET_QUERY_EXECUTE_RESPONSE: GET_QUERY_EXECUTE_RESPONSE,
  GET_GETDOCUMENT_RESPONSE: GET_GETDOCUMENT_RESPONSE,
  GET_GETELEMENT_RESPONSE: GET_GETELEMENT_RESPONSE,
  GET_SETDOCUMENT_RESPONSE: GET_SETDOCUMENT_RESPONSE,
  GET_SETELEMENT_RESPONSE: GET_SETELEMENT_RESPONSE,
  GET_GETSCHEMA_HELLO_RESPONSE: GET_GETSCHEMA_HELLO_RESPONSE,
  GET_HELLO_RESPONSE: GET_HELLO_RESPONSE,
  LOGON_RESPONSE_NO_USERINFO: LOGON_RESPONSE_NO_USERINFO,
    INCREASE_VALUE_RESPONSE: INCREASE_VALUE_RESPONSE,
    FILE_RES_WRITE_RESPONSE: FILE_RES_WRITE_RESPONSE,
}
