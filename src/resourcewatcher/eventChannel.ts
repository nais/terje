import { KubeConfig, Watch } from "@kubernetes/client-node";
import { buffers, END, eventChannel } from "redux-saga";
import parentLogger from "../logger";
import { resourceAdded, resourceDeleted, resourceModified } from "./events";


const logger = parentLogger.child({ module: 'resourcewatcher' })

function watchApiResource(watch: Watch, emitter: (input: {} | END) => void, api: string) {
    return watch.watch(api,
        { "labelSelector": "team" },
        (type: string, obj: any) => {
            logger.debug("type:", type, "resource:", `${obj.metadata.name}.${obj.metadata.namespace}`)
            switch (type) {
                case 'MODIFIED':
                    return emitter(resourceModified(obj.metadata))
                case 'ADDED':
                    return emitter(resourceAdded(obj.metadata))
                case 'DELETED':
                    return emitter(resourceDeleted(obj.metadata))
            }
        },
        (err: any) => {
            logger.warn("watcher ended", api)
            // emitter(END)
            // restart all watchers?
            // for now, just restart ended watcher:
            logger.warn("restarting watcher", api)
            watchApiResource(watch, emitter, api)
            if (err) {
                logger.warn(err, err.stack)
            }
        })
}

export function watchApiResources() {
    let apis = [
        "/api/v1/pods",
        "/api/v1/configmaps",
        "/apis/nais.io/v1alpha1/applications",
        "/apis/storage.spotahome.com/v1alpha2/redisfailovers",
    ]

    return eventChannel(emitter => {
        let kubeConfig = new KubeConfig()
        kubeConfig.loadFromDefault()
        logger.debug(kubeConfig)

        let watch = new Watch(kubeConfig)
        let watchers = apis.map(api => watchApiResource(watch, emitter, api))

        return () => watchers.forEach(watcher => watcher.abort())
    },
        buffers.expanding(10) // We need to explicitly specify a buffer as eventChanel by default does not buffer anything.
    )
}
