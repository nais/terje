import { AuthenticationContext, TokenResponse } from 'adal-node';
import parentLogger from '../logger';
import { creds } from '../util/config';
import { Group, ADGroup } from './types';
import { httpify } from 'caseless';

const HttpsProxyAgent = require('https-proxy-agent')
const MicrosoftGraph = require("@microsoft/microsoft-graph-client"); // Import without types because they're bugged.

const logger = parentLogger.child({ module: 'azure' });
const adalLogger = require('adal-node').Logging;

adalLogger.setLoggingOptions({
    log: (level: string, message: string, error: Error) => {
        if (message) {
            logger.info("adal:", level, message);
        }

        if (error) {
            logger.warn("adal:", level, error);
        }
    },
    level: adalLogger.LOGGING_LEVEL.WARN,
    loggingWithPII: false,
});


export async function getRegisteredTeamsFromSharepoint(): Promise<[Group]> {
    return new Promise<[Group]>(async (resolve, reject) => {
        const response = await get('/groups/9f0d0ea1-0226-4aa9-9bf9-b6e75816fabf/sites/root/lists/nytt team/items?expand=fields').catch(error => {
            logger.warn("failed to get groups from Microsoft Graph Ap", error, error.stack)
            return false;
        });

        if (!response) {
            reject("failed to get groups from Microsoft Graph Api")
            return
        }

        const groupPromises: [Promise<Group>] = response.value
            .filter((group: ADGroup) => group.fields.hasOwnProperty('GruppeID'))
            .map((group: ADGroup) => groupIdWithMail(group.fields.GruppeID));

        Promise.all(groupPromises).then((groupList: any) => {
            return resolve(groupList)
        }).catch(reject)
    });
}

function groupIdWithMail(groupId: string): Promise<Group> {
    return new Promise<Group>((resolve, reject) => {
        logger.info("getting team for group id", groupId)
        get(`/groups/${groupId}`).
            then((response) => {
                const mail = response.mail.toLowerCase();
                const team = mail.substring(0, mail.indexOf("@"));
                resolve({ id: groupId, team: team });
            }).catch(reject);
    });
}

const authorityUrl = 'https://login.windows.net' + '/' + creds.tenantId;
const resource = 'https://graph.microsoft.com';
var context = new AuthenticationContext(authorityUrl);

function get(url: string) {
    return new Promise<any>((resolve, reject) => {
        context.acquireTokenWithClientCredentials(
            resource,
            creds.appId,
            creds.clientSecret,
            function (err: Error, tokenResponse: TokenResponse) {
                if (err) {
                    logger.warn('unable to auth with azure', err,  err.stack);
                } else {
                    const client = MicrosoftGraph.Client.init({
                        defaultVersion: 'v1.0',
                        authProvider: (done: any) => {
                            done(null, tokenResponse.accessToken)
                        },
                        fetchOptions: Object.assign(makeHttpsAgent(), {})
                    })
                    client
                        .api(url)
                        .get()
                        .then(resolve)
                        .catch(reject)
                }
            }
        );
    })
}

function makeHttpsAgent() {
    if (process.env.HTTPS_PROXY) {
        return {agent: HttpsProxyAgent(process.env.HTTPS_PROXY)}
    }

    return {}
}