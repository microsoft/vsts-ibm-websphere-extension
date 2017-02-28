 /*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import tmrm = require('vsts-task-lib/mock-run');
import path = require('path');
import fs = require('fs');
import ma = require('vsts-task-lib/mock-answer');

let taskPath = path.join(__dirname, '..', 'websphere-deploy.js');
let tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);

tmr.setInput('connType', 'address');
tmr.setInput('ipAddress', 'myIpAddress.com');
tmr.setInput('port', '8879');
tmr.setInput('username', 'myUserName');
tmr.setInput('password', 'myPassword');
tmr.setInput('appName', 'deepspace');
tmr.setInput('contentPath', '/my/deepspace.war');
tmr.setInput('installApplicationIfNotExist', 'true');
tmr.setInput('topologyType', 'singleServer');
tmr.setInput('nodeName', 'myNodeName');
tmr.setInput('appServerName', 'myAppServerName');
tmr.setInput('cellName', 'myCellName');
tmr.setInput('webModule', 'Bootcamp Demo App');
tmr.setInput('contextRoot', '/deepspace');
tmr.setInput('virtualHost', 'default_host');
tmr.setInput('uri', 'deepspace.war,WEB-INF/web.xml');
tmr.setInput('startApplication', 'true');
tmr.setInput('installOptions', '-installOptions myInstallOptions');
tmr.setInput('updateOptions', '-updateOptions myUpdateOptions');

let myAnswers: ma.TaskLibAnswers = <ma.TaskLibAnswers> {
    'glob': {
        '**/*.war': ['/my/deepspace.war'],
        '/my/deepspace.war': ['/my/deepspace.war']
    },
    'which': {
        'wsadmin.sh': 'wsadmin.sh',
        'wsadmin': 'wsadmin.sh'
    },
    'checkPath': {
        'wsadmin.sh': true
    },
    'exec': {
        'wsadmin.sh -username myUserName -password myPassword -host myIpAddress.com -port 8879 -conntype SOAP -c AdminConfig.getid(\'/Deployment:deepspace/\');': {
            'code': 0,
            'stdout': ' ',
            'stderr': undefined
        },
        'wsadmin.sh -username myUserName -password myPassword -host myIpAddress.com -port 8879 -conntype SOAP -c AdminApp.taskInfo(\'/my/deepspace.war\', \'MapWebModToVH\');': {
            'code': 0,
            'stdout': '\\nWeb module: Auto Bootcamp Demo App\\nURI: auto_deepspace.war,WEB-INF/web.xml\\nVirtual host: auto_default_host\\n\\n',
            'stderr': undefined
        },
        'wsadmin.sh -username myUserName -password myPassword -host myIpAddress.com -port 8879 -conntype SOAP -c AdminApp.install(\'/my/deepspace.war\', \'[-appname deepspace -node myNodeName -server myAppServerName -cell myCellName -MapWebModToVH [["Bootcamp Demo App" "deepspace.war,WEB-INF/web.xml" "default_host"]] -contextroot /deepspace -installOptions myInstallOptions]\'); AdminConfig.save(); appManager = AdminControl.queryNames(\'cell=myCellName,node=myNodeName,type=ApplicationManager,process=myAppServerName,*\'); AdminControl.invoke(appManager, \'startApplication\', \'deepspace\');': {
            'code': 0,
            'stdout': 'Application deepspace installed successfully.',
            'stderr': undefined
        }
    }
 };

tmr.setAnswers(myAnswers);

// This is how you can mock NPM packages...
fs.statSync = (s) => {
    let stats = require('fs').Stats;
    let stat = new stats();
    stat.isFile = () => {
        console.log(s);
        if (s === '/my/deepspace.war') {
            return true;
        }
    };

    return stat;
};
tmr.registerMock('fs', fs);

tmr.run();
