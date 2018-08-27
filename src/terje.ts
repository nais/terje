import k8s = require('@kubernetes/client-node');
import {createRole} from "./rolecreator";
import {watchResources} from "./resourcewatcher";

const util = require('util');

let kubeConfig = new k8s.KubeConfig();
kubeConfig.loadFromDefault();

let apis = [
    "/api/v1/pods",
    "/api/v1/configmaps",
    "/api/v1/endpoints",
    "/api/v1/resourcequotas",
    "/api/v1/serviceaccounts",
    "/api/v1/secrets",
    "/api/v1/services",
    "/apis/apps/v1/deployments",
    "/apis/apps/v1/replicasets",
    "/apis/apps/v1/statefulsets",
    "/apis/extensions/v1beta1/ingresses",
    "/apis/autoscaling/v1/horizontalpodautoscalers",
];

let resourcesUpdatedCallback = (resources: resourcesMap) => {
    for (let team in resources) {
        for (let namespace in resources[team]) {
            if (!(resources[team].hasOwnProperty(namespace))) {
                console.log("No namespaces for team ", team, "continuing...");
                continue
            }

            let role = createRole(team, namespace, resources[team][namespace]);
            // For now, just print what would have been created.
            console.log(util.inspect(role, {
                showHidden: false,
                depth: null
            }));
        }
    }
};

let watchers = watchResources(apis, kubeConfig, resourcesUpdatedCallback);

