 /*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import tmrm = require('vsts-task-lib/mock-run');
import path = require('path');
import fs = require('fs');

let taskPath = path.join(__dirname, '..', 'websphere-deploy.js');
let tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);

tmr.setInput('contentPath', '**/*.war');
tmr.setInput('appName', 'deepspace');

let myAnswers = {
    'glob': {
        '**/*.war': ['/my/deepspace.war', '/my/2nddeepspace.war']
    }
 };

tmr.setAnswers(myAnswers);

// This is how you can mock NPM packages...
fs.statSync = (s) => {
    let stats = require('fs').Stats;
    let stat = new stats();
    stat.isFile = () => {
        if (s === '/my/deepspace.war' || s === '/my/2nddeepspace.war') {
            return true;
        }
    };

    return stat;
};
tmr.registerMock('fs', fs);

tmr.run();
