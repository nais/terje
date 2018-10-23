import {V1ObjectMeta} from "@kubernetes/client-node";

export function getTeamFromMetadata(labels: { [key: string]: string }): string {
    if (labels) {
        if (labels.hasOwnProperty("team")) {
            return labels.team;
        }
    }
}

export function getResourceTypeFromSelfLink(selfLink: string) {
    // Example selfLink: '/api/v1/namespaces/aura/pods/debug-68cffcddb-vrstj'

    let parts = selfLink.split('/');
    return parts[parts.length - 2]
}

export function createObjectMeta(name: string, namespace: string) {
    const metadata = new V1ObjectMeta();
    metadata.name = name;
    metadata.namespace = namespace;

    return ensureManagedByTerje(metadata);
}

export function ensureManagedByTerje(metadata: V1ObjectMeta): V1ObjectMeta {
    if (!(metadata.labels)) {
        metadata.labels = {"managed-by": "terje"};
    } else {
        metadata.labels["managed-by"] = "terje";
    }

    return metadata;
}
