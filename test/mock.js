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

const REPORT_RESPONSE = Promise.resolve(`<ctx lang="en" date="2022-11-09T06:10:27Z" _target="web" alt_period="604800" statsCount="1" webApp-id="1569" _context="selection" _reportContext="throughput" _hasFilter="false" _selectionCount="1" _selection="12133" _schema="nms:delivery" _folderModel="nmsDelivery" _folderLinkId="@folder-id" _folderLink="folder" activityHist="xxx">
	<userInfo datakitInDatabase="true" homeDir="" instanceLocale="en-US" locale="en-US" login="admin" loginCS="Administrator (admin)" loginId="1059" noConsoleCnx="false" orgUnitId="0" theme="" timezone="Asia/Kolkata" xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns="urn:xtk:session" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
		<login-group id="1060"/>
		<login-right right="admin"/>
	</userInfo>
	<vars>
		<period>604800</period>
		<trunc>3600</trunc>
		<valueScaleFactor>1</valueScaleFactor>
		<dateStepType>hour</dateStepType>
		<dateStepFactor>1</dateStepFactor>
	</vars>
	<activityHistory>
		<activity name="page" type="page"/>
		<activity name="script" type="script"/>
		<activity name="query2" type="query"/>
		<activity name="test" type="test"/>
	</activityHistory>
	<delivery label="Email delivery">
		<scheduling contactDate="2021-12-07 17:13:39.507Z"/>
	</delivery>
	<title>Delivery: Email delivery</title>
	<data>
		<deliveryStat>
		<deliveryStat date="2021-12-07 17:30:00.000Z" count="1" series="Success"/>
		<deliveryStat date="2021-12-07 17:30:00.000Z" count="0" series="Errors"/>
		</deliveryStat>
		<bandwidth>
		<deliveryStat date="2021-12-07 17:30:00.000Z" size="1.34"/>
		</bandwidth>
	</data>
	</ctx>`);

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
                    <method name="NewInstance">
                    </method>
                    <method name="Duplicate" static="true">
                    </method>
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
                    <method name="startsWithLowerCase" static="true">
                        <parameters>
                            <param name="result" type="long" inout="out"/>
                        </parameters>
                    </method>
                    <method name="badParam" static="true">
                        <parameters>
                            <param name="bad" type="long" inout="zz"/>
                        </parameters>
                    </method>
                </methods>
            </schema>
            </pdomDoc>
        </GetEntityIfMoreRecentResponse>
    </SOAP-ENV:Body>
    </SOAP-ENV:Envelope>`);

const GET_XTK_JOB_SCHEMA_RESPONSE = Promise.resolve(`<?xml version='1.0'?>
<SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:wpp:default' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
<SOAP-ENV:Body>
    <GetEntityIfMoreRecentResponse xmlns='urn:wpp:default' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
        <pdomDoc xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
            <schema implements="xtk:jobInterface"  name="job" namespace="xtk" xtkschema="xtk:schema">
            <interface async="true" label="Job interface" name="jobInterface">
                <method const="true" name="Execute">
                <parameters>
                    <param inout="in" name="methodName" type="string"/>
                    <param  inout="out" name="id" type="string"/>
                </parameters>
                </method>
                <method const="true" name="Submit">
                <parameters>
                    <param inout="in" name="methodName" type="string"/>
                    <param inout="out" name="id" type="string"/>
                </parameters>
                </method>
                <method const="true" name="SubmitSoapCall">
                <parameters>
                    <param inout="in" name="soapCall" type="DOMElement"/>
                    <param inout="out" name="id" type="string"/>
                </parameters>
                </method>
                <method name="SubmitFromModel" static="true">
                <parameters>
                    <param inout="in" name="schema" type="string"/>
                    <param inout="in" name="where" type="string"/>
                    <param inout="in" name="methodName" type="string"/>
                    <param inout="in" name="diff" type="DOMElement"/>
                    <param inout="in" name="async" type="boolean"/>
                    <param inout="out" name="jobId" type="long"/>
                </parameters>
                </method>
                <method name="Cancel" static="true">
                <parameters>
                    <param inout="in" name="id" type="string"/>
                </parameters>
                </method>
                <method name="WaitJobCancelled" static="true">
                <parameters>
                    <param inout="in" name="id" type="string"/>
                    <param desc="Maximum wait (in seconds)" inout="in" name="timeout" type="long"/>
                </parameters>
                </method>
                <method name="Pause" static="true">
                <parameters>
                    <param inout="in" name="id" type="string"/>
                </parameters>
                </method>
                <method name="CheckIfJobInProcess" static="true">
                <parameters>
                    <param inout="in" name="pid" type="long"/>
                    <param name="hostName" type="string"/>
                    <param inout="out" name="result" type="boolean"/>
                </parameters>
                </method>
                <method name="GetJobsInProcess" static="true">
                <parameters>
                    <param desc="Returned document" inout="out" name="jobInfo" type="DOMDocument"/>
                </parameters>
                </method>
                <method name="GetStatus" static="true">
                <parameters>
                    <param inout="in" name="id" type="string"/>
                    <param inout="in" name="lastLogId" type="long"/>
                    <param inout="in" name="maxLogCount" type="long"/>
                    <param enum="xtk:jobLog:logType" inout="out" name="status" type="short"/>
                    <param inout="out" name="returnLogs" type="DOMElement"/>
                    <param inout="out" name="properties" type="DOMElement"/>
                </parameters>
                </method>
                <method name="GetResult" static="true">
                <parameters>
                    <param inout="in" name="id" type="string"/>
                    <param inout="out" name="response" type="string"/>
                </parameters>
                </method>
                <method name="HasWarning" static="true">
                <parameters>
                    <param inout="in" name="id" type="string"/>
                    <param inout="out" name="hasWarning" type="boolean"/>
                </parameters>
                </method>
                <method name="FilesExist" static="true">
                <parameters>
                    <param inout="in" name="files" type="DOMDocument"/>
                    <param inout="out" name="exist" type="DOMDocument"/>
                </parameters>
                </method>
                <method name="GetServerDiskSpace" static="true">
                <parameters>
                    <param inout="out" name="serverDiskSpace" type="int64"/>
                </parameters>
                </method>
            </interface>

            <element autopk="true" name="job">
                <attribute name="id" sqlname="iJobId" type="long"/>
            </element>
        </schema>
    </pdomDoc>
    </GetEntityIfMoreRecentResponse>
</SOAP-ENV:Body>
</SOAP-ENV:Envelope>`);

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

const GET_NMS_DELIVERY_SCHEMA_RESPONSE = Promise.resolve(`<?xml version='1.0'?>
<SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:wpp:default' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
<SOAP-ENV:Body>
    <GetEntityIfMoreRecentResponse xmlns='urn:wpp:default' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
        <pdomDoc xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
            <schema name="delivery" namespace="nms" implements="xtk:persist">
                <element name="delivery"></element>
                <methods>
                    <method name="Test">
                    </method>
                </methods>
            </schema>
        </pdomDoc>
    </GetEntityIfMoreRecentResponse>
</SOAP-ENV:Body>
</SOAP-ENV:Envelope>`);

const GET_DELIVERY_TEST_RESPONSE = Promise.resolve(`<?xml version='1.0'?>
<SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:nms:delivery' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
<SOAP-ENV:Body>
    <TestResponse xmlns='urn:nms:delivery' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
        <entity xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
            <delivery>
            </delivery>
        </entity>
    </TestResponse>
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

const GET_NMS_EXTACCOUNT_SCHEMA_WITH_METHODS_RESPONSE = Promise.resolve(`<?xml version='1.0'?>
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
                <methods>
                    <method name="TestAccount" static="true">
                    <help>Performs a connection test</help>
                    <parameters>
                        <param name="type" type="byte" desc="Account type"/>
                        <param name="active" type="boolean" desc="Is account active"/>
                        <param name="server" type="string" desc="Server address" inout="inout"/>
                        <param name="account" type="string" desc="Name (or login) of account"/>
                        <param name="password" type="string" desc="Password associated with account"/>
                        <param name="port" type="string" desc="Server port"/>
                        <param name="options" type="string" desc="Connection options"/>
                        <param name="name" type="string" desc="Account name" optional="true"/>
                        <param name="oauth" type="boolean" desc="OAUth 2.0 activation"/>
                        <param name="azureTenant" type="string" desc="Azure tenant" optional="true"/>
                        <param name="clientId" type="string" desc="Azure client Id" optional="true"/>
                        <param name="clientSecret" type="string" desc="Azure client secret" optional="true"/>
                        <param name="redirectUrl" type="string" desc="Azure redirect url" optional="true"/>
                        <param name="dbmsVer" type="string" desc="DBMS Version" inout="out" optional="true"/>
                        <param name="warehouse" type="string" desc="Warehouse name" inout="out" optional="true"/>
                        <param name="testDuration" type="string" desc="Formatted string displaying connection time in ms" inout="out" optional="true"/>
                    </parameters>
                    </method>
                </methods>
            </schema>
        </pdomDoc>
    </GetEntityIfMoreRecentResponse>
</SOAP-ENV:Body>
</SOAP-ENV:Envelope>`);

const GET_XTK_IMPL_SCHEMA_RESPONSE = Promise.resolve(`<?xml version='1.0'?>
    <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:wpp:default' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
    <SOAP-ENV:Body>
        <GetEntityIfMoreRecentResponse xmlns='urn:wpp:default' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
            <pdomDoc xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
                <schema name="impl" namespace="xtk" xtkschema="xtk:schema" implements="xtk:persist">
                    <element name="one"></element>
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
                            <param inout="in" name="primarykey" type="primarykey"/>
                            <param inout="out" name="string" type="primarykey"/>
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
            <dummy xsi:type='xsd:primarykey'>xtk:operator|123</dummy>
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
                    <method name="SimulateWithParameters" static="true">
                        <parameters>
                            <param name="workflowId" type="string" inout="in" />
                            <param name="parameters" type="DOMElement" inout="in"></param>
                        </parameters>
                    </method>
                    <method name="PostEvent" static="true">              
                        <parameters>
                            <param name="workflowId" type="string" inout="in"/>
                            <param name="activity" type="string" inout="in"/>
                            <param name="transition"     type="string"      inout="in"/>
                            <param name="parameters"     type="DOMElement"  inout="in"/>
                            <param name="complete"       type="boolean"     inout="in"/>
                        </parameters>
                    </method>
                    <method name="SpawnWithParameters" static="true">
                        <parameters>
                            <param name="workflowId" type="string" inout="in" />
                            <param name="parameters" type="DOMElement" inout="in"></param>
                        </parameters>
                    </method>
                    <method name="SpawnWithParametersEx" static="true">
                        <parameters>
                            <param name="workflowId" type="string" inout="in" />
                            <param name="simulation" type="boolean" inout="in"/>
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

const GETMODIFIEDENTITIES_RESPONSE = Promise.resolve(`<?xml version='1.0'?>
    <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:xtk:session' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
    <SOAP-ENV:Body>
        <GetModifiedEntitiesResponse xmlns='urn:xtk:session' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
           <pdomDirtyEntities xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
                <cache buildNumber="9468" time="2022-07-27T14:38:55.766Z"/>
            </pdomDirtyEntities>
        </GetModifiedEntitiesResponse>
    </SOAP-ENV:Body>
    </SOAP-ENV:Envelope>`);

const GETMODIFIEDENTITIES_CLEAR_RESPONSE = Promise.resolve(`<?xml version='1.0'?>
    <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:xtk:session' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
    <SOAP-ENV:Body>
        <GetModifiedEntitiesResponse xmlns='urn:xtk:session' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
            <pdomDirtyEntities xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
                <cache buildNumber="9469" time="2022-07-28T14:38:55.766Z" emptyCache="true"/>
            </pdomDirtyEntities>
        </GetModifiedEntitiesResponse>
    </SOAP-ENV:Body>
    </SOAP-ENV:Envelope>`);
const GET_XTK_COUNTER_RESPONSE = Promise.resolve(`<?xml version='1.0'?>
        <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:wpp:default' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
        <SOAP-ENV:Body>
            <GetEntityIfMoreRecentResponse xmlns='urn:wpp:default' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
                <pdomDoc xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
                    <schema name="counter" namespace="xtk" xtkschema="xtk:schema">
                        <element name="counter"></element>
                        <methods>
                        <method name="IncreaseValue" static="true">
                          <parameters>
                            <param name="name" type="string" label="Name" desc="Counter name"/>
                            <param name="value" type="long" inout="out" label="Value" desc="New value of counter"/>
                          </parameters>
                        </method>
                      </methods>                   
                       </schema>
                </pdomDoc>
            </GetEntityIfMoreRecentResponse>
        </SOAP-ENV:Body>
        </SOAP-ENV:Envelope>`);

const GET_FILERES_QUERY_SCHEMA_RESPONSE = Promise.resolve(`<?xml version='1.0'?>
        <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:wpp:default' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
        <SOAP-ENV:Body>
            <GetEntityIfMoreRecentResponse xmlns='urn:wpp:default' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
                <pdomDoc xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
                    <schema name="fileRes" namespace="xtk" xtkschema="xtk:schema">
                        <element name="fileRes"></element>
                        <methods>
                        <method name="PublishIfNeeded">
                        </method>
                        <method name="GetURL">
                        <parameters>
                          <param name="url" type="string" inout="out"/>
                        </parameters>
                          </method>
                    </methods>                   
                       </schema>
                </pdomDoc>
            </GetEntityIfMoreRecentResponse>
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
  </interface>

</schema></pdomDoc></GetEntityIfMoreRecentResponse></SOAP-ENV:Body></SOAP-ENV:Envelope>

`);

const PUBLISH_IF_NEEDED_RESPONSE = Promise.resolve(`<?xml version='1.0'?>
<SOAP-ENV:Envelope
    xmlns:xsd='http://www.w3.org/2001/XMLSchema'
    xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance'
    xmlns:ns='urn:xtk:fileRes'
    xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
    <SOAP-ENV:Body>
        <PublishIfNeededResponse
            xmlns='urn:xtk:fileRes' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
        </PublishIfNeededResponse>
    </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`);

const GET_URL_RESPONSE = Promise.resolve(`<?xml version='1.0'?>
<SOAP-ENV:Envelope
    xmlns:xsd='http://www.w3.org/2001/XMLSchema'
    xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance'
    xmlns:ns='urn:xtk:fileRes'
    xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
    <SOAP-ENV:Body>
        <GetURLResponse
            xmlns='urn:xtk:fileRes' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
            <pUrl xsi:type='xsd:string'>http://hello.com</pUrl>
        </GetURLResponse>
    </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`);

const GETMODIFIEDENTITIES_SCHEMA_RESPONSE = Promise.resolve(`<?xml version='1.0'?>
    <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:xtk:session' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
    <SOAP-ENV:Body>
        <GetModifiedEntitiesResponse xmlns='urn:xtk:session' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
           <pdomDirtyEntities xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
              <cache buildNumber="9469" time="2022-07-28T15:32:00.785Z">
                 <entityCache lastModified="2022-07-28 15:31:56.331Z" md5="5581959609FEC4B2A9CDBD171BA42E7D" pk="xtk:schema|nms:recipient" schema="xtk:schema"/>
                 <entityCache lastModified="2022-07-28 15:31:56.353Z" md5="B27CC681D00C3FA85DDA0B210FE76566" pk="xtk:schema|nms:replicationStrategy" schema="xtk:schema"/>
                 <entityCache lastModified="2022-07-28 15:31:56.478Z" md5="E39D051D4D00805693EBA4F72F5ABD7D" pk="xtk:schema|nms:recipientStg" schema="xtk:schema"/>
                 <entityCache lastModified="2022-07-28 15:31:56.440Z" md5="23B1FE988F0DCDC88C9F96D06C97FA14" pk="xtk:schema|xxl:xtkFolderXl" schema="xtk:schema"/>
                 <entityCache lastModified="2022-07-28 15:31:56.440Z" md5="23B1FE988F0DCDC88C9F96D06C97FA14" pk="xtk:schema|nms:extAccount" schema="xtk:schema"/>
                 <entityCache lastModified="2022-07-28 15:31:56.440Z" md5="23B1FE988F0DCDC88C9F96D06C97FA14" pk="xtk:option|testOption" schema="xtk:option"/>
              </cache>
           </pdomDirtyEntities>
        </GetModifiedEntitiesResponse>
    </SOAP-ENV:Body>
    </SOAP-ENV:Envelope>`);


const GETMODIFIEDENTITIES_UNDEFINED_RESPONSE = Promise.resolve(`<?xml version='1.0'?>
    <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
    <SOAP-ENV:Body>
    <SOAP-ENV:Fault>
       <faultcode>SOAP-ENV:Client</faultcode>
       <faultstring xsi:type='xsd:string'>SOP-330006 The method 'GetModifiedEntities' is not defined in SOAP service 'xtk:session'.</faultstring>
    </SOAP-ENV:Fault>
    </SOAP-ENV:Body>
    </SOAP-ENV:Envelope>`);

const GETMODIFIEDENTITIES_ERROR_RESPONSE = Promise.resolve(`<?xml version='1.0'?>
    <SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
    <SOAP-ENV:Body>
    <SOAP-ENV:Fault>
       <faultcode>SOAP-ENV:Client</faultcode>
       <faultstring xsi:type='xsd:string'>SOP-330011 Error while executing the method 'GetModifiedEntities' of service 'xtk:session'.</faultstring>
    </SOAP-ENV:Fault>
    </SOAP-ENV:Body>
    </SOAP-ENV:Envelope>`);


const GET_DELIVERY_NEW_INSTANCE_RESPONSE = Promise.resolve(`<?xml version='1.0'?><SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns='urn:nms:delivery' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'><SOAP-ENV:Body><NewInstanceResponse xmlns='urn:nms:delivery' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'><entity xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'><delivery _operation="insert" analysisStep="0" budgetStatus="0" builtIn="false" contentStatus="0" created="2022-09-26 03:13:36.480Z" createdBy-id="6043" deleteStatus="0" deliveryMode="0" deliveryProvider-id="1855" extractionStatus="0" folder-id="1186" folderProcess-id="1206" id="9790" internalName="DM554" isModel="1" jobType="delivery" keepResult="false" label="Email" lastModified="2022-09-26 03:13:36.480Z" launchFCP="0" mapping-id="1775" maxPropositionCount="1" messageType="0" modifiedBy-id="6043" outOfProcess="false" priority="10" sandboxStatus="0" state="0" status="0" targetStatus="0" typology-id="1852" useTargetOffers="false" xtkschema="nms:delivery"><folder _cs="Delivery templates"/><folderProcess _cs="Deliveries"/><createdBy _cs="Gaurav Makkar (gmakkar@adobe.com)"/><modifiedBy _cs="Gaurav Makkar (gmakkar@adobe.com)"/><properties deliveryState="0" warning="false"/><deliveryProvider EMailFunction="0" NChar="0" _cs="Internal email delivery" account="" activationMode="2" active="1" activity="signal" awsKey="" awsRegion="" awsSecret="" azureTenant="" callbackServer="" clientId="" clientSecret="" created="2022-09-16 07:39:50.796Z" createdBy-id="0" dbName="" deliveryMode="1" deployed="0" encryptionType="0" fdaExtAccount-id="0" fileMethod="uploadFile" folder-id="1035" folderSetOfServices-id="0" httpRelayTarget="false" id="1855" imsOrgId="" imsRightsMask="" imsServer="" label="Internal email delivery" lastModified="2022-09-16 07:42:37.469Z" lastMultiUsed="" messageType="0" mirrorURL="" mobileConnector="127" modifiedBy-id="1062" multiMidMode="0" multiMidProvider="0" name="defaultEmailBulk" oAuth="0" onEveryRun="0" packageAutoExport="0" partner="1" password="" port="" productContext="" provider="Snowflake" redirectUrl="" server="" tenant="" timezone="_server_" timezoneName="Europe/Paris" type="3" unicodeData="0" useServerSideEncryption="0" userScope=""><analyticsConfig integrationName="defaultEmailBulk" persistence="7" purge="180" status="3"></analyticsConfig><webAnalyticsParams partner="1" persistence="7" purge="180"><integrationDetails integrationName="defaultEmailBulk" integrationValue="7281015239823888aa73636c74217b84"></integrationDetails></webAnalyticsParams><params allowTranslit="false" bindTimeout="60" dataInOptionalField="false" dataInTextField="false" defaultMoCharset="X-Gsm7Bit" defaultMtCharset="X-Gsm7Bit" deliverIdEncode="default" deliverIdEncode2="0" enableTLS="false" enquireLinkPeriod="30" errorExtractionRegex="\\b[eE][rR][rR]:([a-zA-Z0-9]{3})\\b" errorStatusRegex="^(?:EXPIRED|DELETED|UNDELIV|UNKNOWN|REJECT)" idExtractionRegex="\\b[iI][dD]:([a-fA-F0-9]{1,10})\\b" invalidIdAckLimit="0" maxBinds="1" maxWindow="10" messagePayload="false" messageTimeout="30" rateLimit="0" reconnectPeriod="10" sendFullPhoneNumber="false" skipTLSCertCheck="0" smscName="Generic" statusExtractionRegex="\\b[sS][tT][aA][tT]:([a-zA-Z0-9]{5,15})\\b" submitRespIdEncode="default" submitRespIdEncode2="0" successStatusRegex="^DELIV"><wapPush oAuth="0"/><mms oAuth="0"/><oauthParams thirdPartyApplication="true"/><facebookParams marketingURL="http://www.adobe.com" realtimeSubStatus="0"/><mscrm crmApiVersion="'auto'" crmDeploymentType="webapi" crmGrantType="0"/><salesforce apiVersion="'21.0'"/></params><ffda isFFDA="0" replicationWarehouse="" xxlSchemaSuffix=""/></deliveryProvider><forecast simuResponseType="0" weight="5" weightType="0"><weightFormula>$(deliveryWeight)</weightFormula></forecast><volume duration="1" rate="100"/><scheduling delayExtraction="0" validationMode="manual" webResPurged="false"><waves mode="0" splitDelay="86400" splitSize="20%"/><messagePreparation priority="0"/></scheduling><validation sandboxMode="0" sandboxModeEnforced="0" useBudgetValidation="true" useContentValidation="true" useExtractionValidation="true" useFCPValidation="true" useTargetValidation="true" validationMode="0"><target><validation delay="259200" type="0"/></target><content><validation delay="259200" type="0"/></content><budget><validation delay="259200" type="0"/></budget><extraction><validation delay="259200" type="0"/></extraction><forecast><validation delay="259200" type="0"/></forecast><starting><validation delay="259200" type="0"/></starting><edition><validation delay="259200" type="0"/></edition><external><validation delay="259200" type="0"/></external></validation><execution maxPersoTime="5" maxRetry="5" retryPeriod="3600"><controlGroup type="3"/></execution><typology _cs="Default typology"/><mapping _cs="Recipients (nms:recipient)" blackListAgency="@blackList" blackListEmail="Iif(@blackList!=0, 1, @blackListEmail)" blackListFax="Iif(@blackList!=0, 1,@blackListFax)" blackListPaper="Iif(@blackList!=0, 1,@blackListPostalMail)" blackListPhone="Iif(@blackList!=0, 1,@blackListPhone)" blackListSms="Iif(@blackList!=0, 1,@blackListMobile)" builtIn="1" countryCode="[location/@countryCode]" created="2022-09-16 07:39:50.496Z" createdBy-id="0" defaultOrigin-id="1861" email="Lower(@email)" facebook="" fax="@fax" folder-id="1171" format="@emailFormat" id="1775" isFfda="0" label="Recipients" lastModified="2022-09-16 07:39:52.859Z" modifiedBy-id="0" name="mapRecipient" paper="postalAddress" phone="@phone" recipientLink="" schema="nms:recipient" sms="@mobilePhone" targetSchema="nms:recipient" twitter=""><storage broadLogExclSchema="nms:excludeLogRcp" broadLogFilterKeys="" broadLogRcpKeys="" broadLogSchema="nms:broadLogRcp" broadLogTable="" exclusionType="2" trackingHasDeviceIP="0" trackingLogFilterKeys="" trackingLogRcpKeys="" trackingLogSchema="nms:trackingLogRcp" trackingLogTable=""></storage><social birthDate="@birthDate" email="@email" firstName="@firstName" gender="@gender" lastName="@lastName" locale="@language"/></mapping><scenario validityDuration="432000" webValidityDuration="5184000"/><fcpParameters addFormatInPrefix="true" fcpMailFormat="normal" fcpMode="specificTarget" ignoreBlacklist="true" ignoreDeduplicate="true" ignoreQuarantaine="false" keepDeliveryCode="false" labelPrefix="Proof" useSpecificOutputFile="false"/><mailParameters mirrorPagePolicy="default" needMirrorPage="0" useDefaultErrorAddress="true"><senderName><![CDATA[Automation Inc.]]></senderName><senderAddress><![CDATA[no-reply@Customer.rd.campaign.adobe.com]]></senderAddress><replyAddress><![CDATA[no-reply@Customer.rd.campaign.adobe.com]]></replyAddress><replyName><![CDATA[Automation Inc.]]></replyName></mailParameters><smsParameters mobileMsgType="0" smsAppType="2" smsMode="1" smsPriority="0"/><paperParameters addressPos="ownPage" colorSupport="bw" envelope="C6SW" priceCategory="letterPrio" rectoVerso="recto"/><targets addressField="__db__" allowUnchecked="true" blackListField="__db__" deduplicate="true" excludeOnMissingOffer="0" externalIdField="__db__" formatField="__db__" fromExternalSource="false" maxErrorCount="3" noRcpIdDedup="false" noReconciliation="false" qualityRequired="3" segmentCodeField="__db__" targetMode="0" useBlackList="true" useQuality="1" useQuarantine="1"><deliveryTarget nonEmpty="false"/><proofTarget nonEmpty="false"/><deliveryFile autoDelete="false" upload="true"/><proofFile autoDelete="false" upload="true"/><postalAddress addrDefinedField="__none__" addrErrorCountField="__none__" addrLastCheckField="__none__" addrQualityField="__none__" line1Field="__db__" line2Field="__db__" line3Field="__db__" line4Field="__db__" line5Field="__db__" line6Field="__db__" line7Field="__db__"/></targets><remoteContent remoteValidation="false"/><content IsImagePublished="false" embedImages="false" fcbContentType="0" formatSelection="preferences" htmlCompression="false" ignoreScripts="false" pdfCompression="true" pdfType="simple"><lineContentType><source>text</source></lineContentType><lineVersion><source>line</source></lineVersion><lineDeliveryType><source>pushMsg</source></lineDeliveryType><lineImageType><source>manual</source></lineImageType><lineMultiRegionLayoutType><source>1</source></lineMultiRegionLayoutType></content><output enableLinkDelivery="true" feedbackMode="none"><seedList insertMode="0"/><extraction><source batchSize="200" format="text" rejectsFromTextConnector="false" startPath="/" upload="true"><dataSourceConfig codepage="1252" colType="0" ignoreConfigCheck="false" textQualifier="none" timezone="_inherit_" useCR="false" useLF="false"/><dataSourceConfigDest codepage="1252" colType="0" ignoreConfigCheck="false" textQualifier="none" timezone="_inherit_" useCR="false" useLF="false"/></source><destination downloadDestFile="true" endRecord="0" progressLines="20" putUnmappedCols="true" splitOverOrigin="false" startPath="/" startRecord="0" transactionLines="200"><exportFormat allAsString="false" analyze="false" codepage="1252" delEscaping="duplicateDel" delimitor="delNone" format="text" lineEnd="0" saveTitle="true" separator="sepTab" timezone="_inherit_"><dataFormat decimalCount="-1" hideTime="false" orderDate="ymd" sepDate="/" sepDateTime=" " sepNumber="." sepThousand="false" sepTime=":" showMs="false" showSec="true" yearShort="false"/></exportFormat></destination></extraction></output><tracking enabled="true" openEnabled="true"><clickFormula><![CDATA[<%@ include option='NmsTracking_ClickFormula' %>]]></clickFormula><openFormula><![CDATA[<%@ include option='NmsTracking_OpenFormula' %>]]></openFormula></tracking><advancedParameters DBPreparationMode="0" codepage="65001" emailArchiving="false" emailBCCEmta="false" forceCodepage="false" outOfProcessMode="false" showSQL="false" useDBPreparation="false" useDataManagement="false" verifyMode="false"/><budgetParameters commitmentLevel="0" computationState="0"/></delivery></entity></NewInstanceResponse></SOAP-ENV:Body></SOAP-ENV:Envelope>`);

const GET_DATCO_SCHEMA_RESPONSE = Promise.resolve(`<?xml version='1.0'?>
<SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema'
  xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance'
  xmlns:ns='urn:wpp:default'
  xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
  <SOAP-ENV:Body>
    <GetEntityIfMoreRecentResponse xmlns='urn:wpp:default' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
      <pdomDoc xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
        <schema entitySchema="xtk:schema" label="Data Models" labelSingular="Data Model" mappingType="sql" name="dataModel" namespace="daco" xtkschema="xtk:schema">
          <element autopk="true" name="dataModel">
            <compute-string expr="@id"/>
            <key internal="true" name="id">
              <keyfield xpath="@id"/>
            </key>
            <attribute desc="Internal primary key" label="Primary key" name="id" sqlname="iDataModelId" type="long"/>
            <attribute label="Name" length="255" name="name" sqlname="sName" type="string"/>
          </element>
          <methods>
            <method library="daco:dataModel.js" name="test">
              <help>Test API</help>
              <parameters>
                <param desc="Message" inout="in" name="msg" type="string"/>
                <param desc="Response" inout="out" name="resp" type="string"/>
              </parameters>
            </method>
          </methods>
        </schema>
      </pdomDoc>
    </GetEntityIfMoreRecentResponse>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`);

const GET_DATCO_TEST_RESPONSE = Promise.resolve(`<?xml version='1.0'?>
<SOAP-ENV:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema'
xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance'
xmlns:ns='urn:daco:dataModel'
xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/'>
<SOAP-ENV:Body>
  <testResponse xmlns='urn:daco:dataModel' SOAP-ENV:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'>
    <this xsi:type='ns:Element' SOAP-ENV:encodingStyle='http://xml.apache.org/xml-soap/literalxml'>
      <dataModel name="testDataModel" xtkschema="daco:dataModel"/>
    </this>
    <resp xsi:type='xsd:string'>hi - hello from client</resp>
  </testResponse>
</SOAP-ENV:Body>
</SOAP-ENV:Envelope>
`);

const FILE_DOWNLOAD_RESPONSE = '"First Name","Last Name","E-Mail","Blocked","Title","Phone","Units","Gender","Department","Location","Preference 1","Preference 2"\n"Vishal","Kumar (from file)","kumarvishal@adobe.com","false","Developer","9911422203","$030,321","Male","UI","N132","Agriculture","Forestry and Fishing"';

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
  REPORT_RESPONSE: REPORT_RESPONSE,
  LOGON_RESPONSE: LOGON_RESPONSE,
  BEARER_LOGON_RESPONSE: BEARER_LOGON_RESPONSE,
  LOGON_RESPONSE_NO_SESSIONTOKEN: LOGON_RESPONSE_NO_SESSIONTOKEN,
  LOGON_RESPONSE_NO_SECURITYTOKEN: LOGON_RESPONSE_NO_SECURITYTOKEN,
  LOGOFF_RESPONSE: LOGOFF_RESPONSE,
  GET_XTK_SESSION_SCHEMA_RESPONSE: GET_XTK_SESSION_SCHEMA_RESPONSE,
  GET_XTK_JOB_SCHEMA_RESPONSE: GET_XTK_JOB_SCHEMA_RESPONSE,
  GET_DATABASEID_RESPONSE: GET_DATABASEID_RESPONSE,
  GET_OPTION_NOTFOUND_RESPONSE: GET_OPTION_NOTFOUND_RESPONSE,
  GET_OPTION_MISSING_DATA_RESPONSE: GET_OPTION_MISSING_DATA_RESPONSE,
  GET_XTK_QUERY_SCHEMA_RESPONSE: GET_XTK_QUERY_SCHEMA_RESPONSE,
  GET_NMS_DELIVERY_SCHEMA_RESPONSE: GET_NMS_DELIVERY_SCHEMA_RESPONSE,
  GET_DELIVERY_TEST_RESPONSE: GET_DELIVERY_TEST_RESPONSE,
  GET_MID_EXT_ACCOUNT_RESPONSE: GET_MID_EXT_ACCOUNT_RESPONSE,
  GET_BAD_EXT_ACCOUNT_RESPONSE: GET_BAD_EXT_ACCOUNT_RESPONSE,
  GET_SECRET_KEY_OPTION_RESPONSE: GET_SECRET_KEY_OPTION_RESPONSE,
  GET_LOGON_MID_RESPONSE: GET_LOGON_MID_RESPONSE,
  GET_TSTCNX_RESPONSE: GET_TSTCNX_RESPONSE,
  GET_NMS_EXTACCOUNT_SCHEMA_RESPONSE: GET_NMS_EXTACCOUNT_SCHEMA_RESPONSE,
  GET_NMS_EXTACCOUNT_SCHEMA_WITH_METHODS_RESPONSE: GET_NMS_EXTACCOUNT_SCHEMA_WITH_METHODS_RESPONSE,
  GET_XTK_ALL_SCHEMA_RESPONSE: GET_XTK_ALL_SCHEMA_RESPONSE,
  GET_XTK_IMPL_SCHEMA_RESPONSE: GET_XTK_IMPL_SCHEMA_RESPONSE,
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
  GETMODIFIEDENTITIES_RESPONSE: GETMODIFIEDENTITIES_RESPONSE,
  GETMODIFIEDENTITIES_CLEAR_RESPONSE: GETMODIFIEDENTITIES_CLEAR_RESPONSE,
  GETMODIFIEDENTITIES_SCHEMA_RESPONSE: GETMODIFIEDENTITIES_SCHEMA_RESPONSE,
  GETMODIFIEDENTITIES_UNDEFINED_RESPONSE: GETMODIFIEDENTITIES_UNDEFINED_RESPONSE,
  GETMODIFIEDENTITIES_ERROR_RESPONSE: GETMODIFIEDENTITIES_ERROR_RESPONSE,
  GET_XTK_COUNTER_RESPONSE: GET_XTK_COUNTER_RESPONSE,
  GET_FILERES_QUERY_SCHEMA_RESPONSE: GET_FILERES_QUERY_SCHEMA_RESPONSE,
  INCREASE_VALUE_RESPONSE: INCREASE_VALUE_RESPONSE,
  FILE_DOWNLOAD_RESPONSE: FILE_DOWNLOAD_RESPONSE,
  FILE_RES_WRITE_RESPONSE: FILE_RES_WRITE_RESPONSE,
  PUBLISH_IF_NEEDED_RESPONSE: PUBLISH_IF_NEEDED_RESPONSE,
  GET_URL_RESPONSE: GET_URL_RESPONSE,
  GET_DELIVERY_NEW_INSTANCE_RESPONSE: GET_DELIVERY_NEW_INSTANCE_RESPONSE,
  GET_DATCO_SCHEMA_RESPONSE: GET_DATCO_SCHEMA_RESPONSE,
  GET_DATCO_TEST_RESPONSE: GET_DATCO_TEST_RESPONSE
}
