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

 async function makeAnonymousClient(options) {
    const connectionParameters = sdk.ConnectionParameters.ofAnonymousUser("http://acc-sdk:8080", options);
    const client = await sdk.init(connectionParameters);
    client._transport = jest.fn();
    return client;
}

async function makeClient(options) {
    const connectionParameters = sdk.ConnectionParameters.ofUserAndPassword("http://acc-sdk:8080", "admin", "admin", options);
    const client = await sdk.init(connectionParameters);
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
            <pstrSecurityToken xsi:type='xsd:string'>@mMBSMLXIpQd56agsZ5X7OGXWz8Q476qMq6FimwqCdT1wByRDq3pQtaYSY4uJnAbCgXIvpXA5TrxHu-3YjUad5g==</pstrSecurityToken>
        </LogonResponse>
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

const GET_MID_EXT_ACCOUNT_RESPONSE = Promise.resolve(`<?xml version='1.0'?>
    <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:xtk:queryDef' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
    <SOAP-ENV:Body>
        <ExecuteQueryResponse xmlns='urn:xtk:queryDef' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
            <pdomOutput xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
                <extAccount account="mid" id="2088" name="defaultEmailMid" password="@57QS5VHMb9BCsojLVrKI/Q==" server="http://ffdamid:8080" type="3"/>
            </pdomOutput>
        </ExecuteQueryResponse>
    </SOAP-ENV:Body>
    </SOAP-ENV:Envelope>`);

const GET_BAD_EXT_ACCOUNT_RESPONSE = Promise.resolve(`<?xml version='1.0'?>
    <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:xtk:queryDef' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
    <SOAP-ENV:Body>
        <ExecuteQueryResponse xmlns='urn:xtk:queryDef' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
            <pdomOutput xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
                <extAccount account="bad" id="2088" name="bad" password="@57QS5VHMb9BCsojLVrKI/Q==" server="http://zz:8080" type="999"/>
            </pdomOutput>
        </ExecuteQueryResponse>
    </SOAP-ENV:Body>
    </SOAP-ENV:Envelope>`);

const GET_SECRET_KEY_OPTION_RESPONSE = Promise.resolve(`<?xml version='1.0'?>
    <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:xtk:session' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
    <SOAP-ENV:Body>
        <GetOptionResponse xmlns='urn:xtk:session' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
            <pstrValue xsi:type='xsd:string'>HMLmn6uvWr8wu1Akt8UORr07YbC64u1FVW7ENAxNjpo=</pstrValue>
            <pbtType xsi:type='xsd:byte'>6</pbtType>
        </GetOptionResponse>
    </SOAP-ENV:Body>
    </SOAP-ENV:Envelope>`);

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



// Public exports
exports.Mock = {
  makeClient: makeClient,
  makeAnonymousClient: makeAnonymousClient,
  withMockConsole: withMockConsole,
  R_TEST: R_TEST,
  PING: PING,
  MC_PING: MC_PING,
  MC_PING_ERROR: MC_PING_ERROR,
  LOGON_RESPONSE: LOGON_RESPONSE,
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
  LOGON_RESPONSE_NO_USERINFO: LOGON_RESPONSE_NO_USERINFO
}
