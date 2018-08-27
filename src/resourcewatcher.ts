import k8s = require('@kubernetes/client-node');
import {KubeConfig, V1ObjectMeta} from "@kubernetes/client-node";

export let watchResources = (apis: string[], kubeConfig: KubeConfig, resourcesUpdatedCallback: ((resources: resourcesMap) => any))  => {
    // State
    const resources: resourcesMap = {};

    let getResourceTypeFromSelfLink = (selfLink: string) => {
        // Example selfLink: '/api/v1/namespaces/aura/pods/debug-68cffcddb-vrstj'

        let parts = selfLink.split('/');
        return parts[parts.length - 2]
    };

    let addResource = (metadata: V1ObjectMeta) => {
        if (metadata.labels) {
            let name = metadata.name;
            let namespace = metadata.namespace;
            let team = metadata.labels.team;
            let resourceType = getResourceTypeFromSelfLink(metadata.selfLink);

            if (team) {
                if (!(team in resources)) {
                    resources[team] = {};
                }

                if (!(namespace in resources[team])) {
                    resources[team][namespace] = {};
                }

                if (!(resourceType in resources[team][namespace])) {
                    resources[team][namespace][resourceType] = [];
                }

                resources[team][namespace][resourceType].push(name);
            }
        }
    };

    let watchApi = (api: string) => {
        return watch.watch(api,
            // optional query parameters can go here.
            {},
            // callback is called for each received object.
            (type, obj) => {
                if (type == 'ADDED') {
                    console.log('new object:', obj.metadata.name);
                    addResource(obj.metadata);
                } else if (type == 'MODIFIED') {
                    console.log('changed object:', obj.metadata.name);
                } else if (type == 'DELETED') {
                    console.log('deleted object:', obj.metadata.name);
                } else {
                    console.log('unknown type: ' + type);
                }

            },

            // done callback is called if the watch terminates normally
            (err) => {
                if (err) {
                    console.log(err);
                }
            });
    };

    let watch = new k8s.Watch(kubeConfig);

    setInterval(() => resourcesUpdatedCallback(resources), 10 * 1000);
    return apis.map(watchApi);
};

