"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkConditions = exports.objEquals = exports.isObject = void 0;
const tslib_1 = require("tslib");
const core = tslib_1.__importStar(require("@actions/core"));
const fs = tslib_1.__importStar(require("fs"));
const YAML = tslib_1.__importStar(require("yaml"));
const fs_helper_1 = require("./fs-helper");
const isObject = (v) => {
    return v && typeof v === 'object';
};
exports.isObject = isObject;
function objEquals(v1, v2) {
    core.debug(`Comparing a:${JSON.stringify(v1)} to b:${JSON.stringify(v2)} (${v1 === v2})`);
    return v1 === v2;
}
exports.objEquals = objEquals;
function checkConditions(a, b) {
    for (const k of Object.keys(b)) {
        if (exports.isObject(a[k]) && exports.isObject(b[k]) ? checkConditions(a[k], b[k]) : objEquals(a[k], b[k])) {
            return true;
        }
        else {
            return false;
        }
    }
    return false;
}
exports.checkConditions = checkConditions;
const yamlConfigPath = '.github/github_event_jira_transitions.';
class TransitionEventManager {
    constructor(context, jira, argv) {
        this.projects = {};
        this.failOnError = false;
        this.listenForEvents = [];
        this.jira = jira;
        this.context = context;
        this.failOnError = argv.failOnError;
        this.ignoredStates = new Map();
        let yml;
        if (argv.jiraTransitionsYaml) {
            yml = argv.jiraTransitionsYaml;
        }
        else if (fs_helper_1.fileExistsSync(yamlConfigPath + 'yml')) {
            yml = fs.readFileSync(yamlConfigPath + 'yml', 'utf8');
        }
        else if (fs_helper_1.fileExistsSync(yamlConfigPath + 'yaml')) {
            yml = fs.readFileSync(yamlConfigPath + 'yaml', 'utf8');
        }
        else {
            throw new Error(`No GitHub event configuration found as an input or as yml file in ${yamlConfigPath}`);
        }
        const yObj = YAML.parse(yml);
        if (!Object.prototype.hasOwnProperty.call(yObj, 'projects')) {
            const estring = `The YAML config file doesn't have a 'projects' key`;
            if (this.failOnError) {
                throw new Error(estring);
            }
            else {
                core.warning(estring);
                return this;
            }
        }
        this.projects = yObj.projects;
        Object.entries(this.projects).forEach(([projectName, transitionEvent]) => {
            const pName = projectName.toUpperCase();
            core.info(`Project ${pName} configuration loaded`);
            if (transitionEvent.ignored_states) {
                this.ignoredStates.set(pName, transitionEvent.ignored_states);
            }
        });
    }
    getIgnoredStates(currentProject) {
        var _a;
        return (_a = this.ignoredStates.get(currentProject.toUpperCase())) !== null && _a !== void 0 ? _a : [];
    }
    githubEventToState(currentProjectName) {
        core.debug(`starting githubEventToState(${currentProjectName})`);
        core.debug(`Github Context is \n${YAML.stringify(this.context)}`);
        if (Object.prototype.hasOwnProperty.call(this.projects, currentProjectName)) {
            core.debug(`looping through Projects to get transition conditions`);
            const transitionEvent = this.projects[currentProjectName];
            for (const stateName of Object.keys(transitionEvent.to_state)) {
                core.debug(`Checking GitHub context against conditions needed to transition to ${stateName}`);
                for (const ixConditions of Object.values(transitionEvent.to_state[stateName])) {
                    core.debug(`Checking GitHub payload is compared to: \n${YAML.stringify(ixConditions)}`);
                    if (checkConditions(this.context, ixConditions)) {
                        core.debug(`Checking GitHub payload meets the conditions to transition to ${stateName}`);
                        return stateName;
                    }
                }
            }
        }
        else {
            core.debug(`No project found in config named ${currentProjectName}`);
        }
        return '';
    }
}
exports.default = TransitionEventManager;
//# sourceMappingURL=TransitionEventManager.js.map