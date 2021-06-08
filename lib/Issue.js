"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core = tslib_1.__importStar(require("@actions/core"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const TransitionEventManager_1 = tslib_1.__importDefault(require("./TransitionEventManager"));
class Issue {
    constructor(issue, jira, argv, context) {
        var _a, _b;
        this.transitionNames = [];
        this.transitionIds = [];
        this.beforeStatus = null;
        this.toStatus = null;
        this.status = null;
        this.issueObject = null;
        this.issueTransitions = undefined;
        this.transitionsLogString = [];
        this.issue = issue;
        const pmatch = issue.match(/(?<projectName>[a-zA-Z]{2,})-[0-9]{2,}/);
        this.projectName = (_b = (_a = pmatch === null || pmatch === void 0 ? void 0 : pmatch.groups) === null || _a === void 0 ? void 0 : _a.projectName.toUpperCase()) !== null && _b !== void 0 ? _b : '';
        this.jira = jira;
        this.argv = argv;
        this.transitionEventManager = new TransitionEventManager_1.default(context, jira, argv);
    }
    async build() {
        var _a;
        await this.getJiraIssueObject();
        this.beforeStatus = await this.getStatus();
        this.toStatus = this.transitionEventManager.githubEventToState(this.projectName);
        this.issueTransitions = await this.getTransitions();
        if (this.issueTransitions) {
            for (const transition of this.issueTransitions) {
                if (transition.id) {
                    this.transitionIds.push(transition.id);
                }
                if (transition.name) {
                    this.transitionNames.push(transition.name);
                }
                let stateName = 'unknown';
                if (transition['to'] !== undefined) {
                    stateName = (_a = transition['to'].name) !== null && _a !== void 0 ? _a : 'unknown';
                }
                this.transitionsLogString.push(`{ id: ${transition.id}, name: ${transition.name} } transitions issue to '${stateName}' status.`);
            }
        }
        return this;
    }
    requiresTransition() {
        if (this.status === null)
            return false;
        return !this.transitionEventManager.getIgnoredStates(this.projectName).includes(this.status);
    }
    transitionToApply() {
        if (this.toStatus) {
            const iT = lodash_1.default.find(this.issueTransitions, t => {
                var _a, _b;
                if (t.to && ((_a = t.to.name) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === ((_b = this.toStatus) === null || _b === void 0 ? void 0 : _b.toLowerCase())) {
                    return true;
                }
            });
            return {
                ...iT,
                isGlobal: true
            };
        }
        else if (this.status) {
            return lodash_1.default.find(this.issueTransitions, t => {
                var _a, _b, _c;
                if (((_b = (_a = t.name) === null || _a === void 0 ? void 0 : _a.toLowerCase) === null || _b === void 0 ? void 0 : _b.call(_a)) === ((_c = this.status) === null || _c === void 0 ? void 0 : _c.toLowerCase())) {
                    return true;
                }
            });
        }
        else {
            return undefined;
        }
    }
    async transition() {
        const transitionToApply = this.transitionToApply();
        if (transitionToApply) {
            core.info(`${this.issue} will attempt to transition to: ${JSON.stringify(transitionToApply)}`);
            try {
                core.info(`Applying transition for ${this.issue}`);
                await this.jira.transitionIssue(this.issue, transitionToApply);
                this.status = await this.getStatus(true);
                core.info(`Changed ${this.issue} status from ${this.beforeStatus} to ${this.status}.`);
            }
            catch (error) {
                core.error(`Transition failed for ${this.issue}`);
                if (this.argv.failOnError) {
                    throw error;
                }
                else {
                    core.error(error);
                }
            }
        }
        else {
            core.info('Possible transitions:');
            core.info(this.transitionsLogString.join('\n'));
        }
    }
    async getOutputs() {
        var _a;
        return {
            issue: this.issue,
            names: this.transitionNames,
            ids: this.transitionIds,
            status: (_a = this.status) !== null && _a !== void 0 ? _a : (await this.getStatus(true)),
            beforestatus: this.beforeStatus
        };
    }
    async getStatus(fresh = false) {
        if (fresh) {
            await this.getJiraIssueObject();
        }
        return lodash_1.default.get(this.issueObject, 'fields.status.name');
    }
    setIssue(issue) {
        this.issue = issue;
    }
    async getTransitions() {
        const { transitions } = await this.jira.getIssueTransitions(this.issue);
        if (transitions == null) {
            core.warning('No transitions found for issue');
            if (this.argv.failOnError)
                throw new Error(`Issue ${this.issue} has no available transitions`);
        }
        return transitions;
    }
    async getJiraIssueObject() {
        this.issueObject = await this.jira.getIssue(this.issue);
        return this.issueObject;
    }
}
exports.default = Issue;
//# sourceMappingURL=Issue.js.map