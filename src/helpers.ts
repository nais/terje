import { V1ObjectMeta } from "@kubernetes/client-node";

export function getTeamFromMetadata(labels: { [key: string]: string }): string {
    if (labels) {
        if (labels.hasOwnProperty("team")) {
            return labels.team
        }
    }
}

export function getResourceTypeFromSelfLink(selfLink: string): string {
    if (!selfLink) return

    const parts = selfLink.split('/')
    return parts[parts.length - 2]
}

export function createObjectMeta(name: string, namespace?: string) {
    const metadata = new V1ObjectMeta()
    metadata.name = name
    if (namespace) {
        metadata.namespace = namespace
    }

    return setManagedByTerjeLabel(metadata)
}

export function byLabelValueCaseInsensitive(key: string, value: string) {
    return (obj: { metadata: V1ObjectMeta }) => {
        return obj &&
            obj.metadata &&
            obj.metadata.labels &&
            obj.metadata.labels.hasOwnProperty(key) &&
            obj.metadata.labels[key.toLowerCase()] === value.toLowerCase()
    }
}

export function setManagedByTerjeLabel(metadata: V1ObjectMeta): V1ObjectMeta {
    let metadataCopy = Object.assign({}, metadata)

    if (!(metadataCopy.labels)) {
        metadataCopy.labels = { "managed-by": "terje" }
    } else {
        metadataCopy.labels["managed-by"] = "terje"
    }

    return metadataCopy
}
