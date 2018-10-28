import { KubeConfig, Watch } from "@kubernetes/client-node";
import { buffers, END, eventChannel } from "redux-saga";
import parentLogger from "../logger";
import { resourceAdded, resourceDeleted } from "./events";


const logger = parentLogger.child({ module: 'resourcewatcher' })

export function watchApiResources() {
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
        "/apis/nais.io/v1alpha1/applications",
    ]

    return eventChannel(emitter => {
        let kubeConfig = new KubeConfig()
        kubeConfig.loadFromDefault()
        logger.debug(kubeConfig)

        let watch = new Watch(kubeConfig)

        let watchers = apis.map(api => {
            return watch.watch(api,
                { "labelSelector": "team" },
                (type: string, obj: any) => {
                    logger.debug("type:", type, "obj:", obj)
                    switch (type) {
                        case 'MODIFIED':
                            return emitter(resourceAdded(obj.metadata))
                        case 'ADDED':
                            return emitter(resourceAdded(obj.metadata))
                        case 'DELETED':
                            return emitter(resourceDeleted(obj.metadata.name))
                    }
                },

                (err: any) => {
                    emitter(END)
                    if (err) {
                        logger.warn(err, err.stack)
                    }
                })
        })

        return () => watchers.forEach(watcher => watcher.abort())
    },
        buffers.expanding(10) // We need to explicitly specify a buffer as eventChanel by default does not buffer anything.
    )
}
