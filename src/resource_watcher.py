from logger import get_logger


def watch_resource(queue, namespace, api_call, api_watcher):
    logger = get_logger(__name__)
    logger.info('Initialized watcher.')

    for event in api_watcher.stream(api_call, namespace):
        logger.info('got event %s', event)
        event_type = event['type']

        if event_type in ['ADDED', 'DELETED', 'MODIFIED']:
            obj = event['object']
            team = _safe_get_label(obj, 'team')

            resource_updated_event = {
                'eventType': event_type,
                'team': team,
                'kind': obj.kind,
                'resourceName': obj.metadata.name,
            }

            logger.info('%s %s %s %s', team, event_type, obj.kind, obj.metadata.name)

            queue.put(resource_updated_event)

    logger.info('stopped watcher')


def _safe_get_label(resource, label):
    if resource.metadata.labels is not None and label in resource.metadata.labels.keys():
        value = resource.metadata.labels[label]
        if len(value) > 0:
            return value
    return None
