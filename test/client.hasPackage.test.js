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
 * Unit tests for for the client.hasPackage function
 * 
 *********************************************************************************/

 const sdk = require('../src/index.js');


async function makeClient(options) {
    const connectionParameters = sdk.ConnectionParameters.ofUserAndPassword("http://acc-sdk:8080", "admin", "admin", options);
    const client = await sdk.init(connectionParameters);
    client._transport = jest.fn();
    return client;
}

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


describe('ACC Client (has package)', () => {

  it('should find packages', async () => {
    const client = await makeClient();
    client._transport.mockReturnValueOnce(LOGON_RESPONSE);
    await client.NLWS.xtkSession.logon();

    expect(client.hasPackage("nms:campaign")).toBeTruthy();
    expect(client.hasPackage("nms", "campaign")).toBeTruthy();
    expect(client.hasPackage("nms:mrm")).toBeFalsy();
    expect(client.hasPackage("nms", "mrm")).toBeFalsy();
    expect(client.hasPackage("nms:core")).toBeTruthy();
    expect(client.hasPackage("nms", "core")).toBeTruthy();
  });

  it('should fail when unlogged', async () => {
    const client = await makeClient();
    expect(() => {client.hasPackage("nms:campaign") }).toThrow("SDK-000010");
  });

});
