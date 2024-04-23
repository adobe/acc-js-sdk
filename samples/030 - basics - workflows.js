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
const utils = require("./utils.js");

/* Basic samples illustrating how to manage workflows
 */

( async () => {

  await utils.sample({
    title: "Activate a workflow via a signal",
    labels: [ "xtk:workflow", "Basics", "Workflow", "Signal" ],
    description: `The PostEvent method activats a signal activity of a workflow`,
    code: async() => {
      return await utils.logon(async (client, NLWS) => {
        console.log("This sample will post an event to a signal activity of a workflow.");
    
        const workflowIdOrName = "WKF20";
        const activityName = "signal";
        const transitionName = "";
        const variables = { hello: "world" };
        const complete = false;
        await NLWS.xtkWorkflow.postEvent(workflowIdOrName, activityName, transitionName, variables, complete);

      });
    }
  });

  
})();

