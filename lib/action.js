"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Action = void 0;
const tslib_1 = require("tslib");
const core = tslib_1.__importStar(require("@actions/core"));
const Issue_1 = tslib_1.__importDefault(require("./Issue"));
const Jira_1 = tslib_1.__importDefault(require("./Jira"));
const issuesList = [];
class Action {
    constructor(githubEvent, argv) {
        this.jira = new Jira_1.default({
            baseUrl: argv.config.baseUrl,
            token: argv.config.token,
            email: argv.config.email
        });
        this.config = argv.config;
        this.argv = argv;
        this.githubEvent = githubEvent;
    }
    async execute() {
        const { argv } = this;
        const issueList = argv.issues.split(',');
        let successes = 0;
        let failures = 0;
        for (const issueId of issueList) {
            const issue = await new Issue_1.default(issueId.trim(), this.jira, this.argv, this.githubEvent).build();
            issuesList.push(issue);
            try {
                await issue.transition();
                successes += 1;
            }
            catch (error) {
                failures += 1;
                if (argv.failOnError) {
                    core.setFailed(error);
                }
                else {
                    core.error(error);
                }
            }
        }
        async function getOutputs() {
            return Promise.all(issuesList.map(async (i) => await i.getOutputs()));
        }
        core.setOutput('issueOutputs', JSON.stringify(await getOutputs()));
        return failures === 0 && issueList.length === successes;
    }
}
exports.Action = Action;
//# sourceMappingURL=action.js.map