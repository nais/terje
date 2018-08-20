import signal
import time
from collections import defaultdict
from multiprocessing import Process, Queue

from kubernetes import client, watch

from logger import get_logger
from resource_watcher import watch_resource

logger = get_logger(__name__)


def _defaultdict_of_set():
    return defaultdict(set)


def _defaultdict_of_defaultdict_of_set():
    return defaultdict(_defaultdict_of_set)


class ResourceManager(Process):
    def __init__(self, namespace, resource_manager_control_queue, resources_inform_queue):
        Process.__init__(self)

        self.resources = _defaultdict_of_defaultdict_of_set()
        self.queue = Queue()
        self.control_queue = resource_manager_control_queue
        self.resources_inform_queue = resources_inform_queue
        self.namespace = namespace
        self.events_since_last_inform = 0
        self.last_inform_ts = 0

    def _remove_resource_name(self, team, kind, resource_name):
        self.resources[team][kind].remove(resource_name)

    def _add_resource_name(self, team, kind, resource_name):
        self.resources[team][kind].add(resource_name)

    def _find_resource_name_team(self, kind, resource_name):
        for team, resources in self.resources.items():
            if resource_name in resources[kind]:
                logger.info('found old resource: %s, owned by team: %s', resource_name, team)
                return team
        return None

    def _inform_role_manager(self):
        self.resources_inform_queue.put(self.resources)

    def _inform_role_manager_if_appropriate(self):
        self.events_since_last_inform += 1
        if self.events_since_last_inform > 1000:
            self._inform_role_manager()
        elif time.time() - self.last_inform_ts > 5:
            self._inform_role_manager()

    def process_event(self, event):
        team, kind, resource_name = event['team'], event['kind'], event['resourceName']
        if not team:
            team = 'no_team'

        if event['eventType'] == 'ADDED':
            self._add_resource_name(team, kind, resource_name)
        elif event['eventType'] == 'DELETED':
            self._remove_resource_name(team, kind, resource_name)
        elif event['eventType'] == 'MODIFIED':
            # find existing resource and delete if found
            existing_team = self._find_resource_name_team(kind, resource_name)
            if existing_team:
                self._remove_resource_name(existing_team, kind, resource_name)

            # Second, re-add the resource to correct team.
            self._add_resource_name(team, kind, resource_name)

    def run(self):
        # Shouls be stopped by operator thread posting to control_queue instead.
        signal.signal(signal.SIGINT, signal.SIG_IGN)

        logger.info('Running watchers')
        watchers = []

        def watch_resource_in_process(api_call):
            api_watcher = watch.Watch()
            process = Process(target=watch_resource, args=[self.queue, self.namespace, api_call, api_watcher])
            watchers.append((api_watcher, process))
            process.start()

        coreApi = client.CoreV1Api()
        appsApi = client.AppsV1Api()
        extensionsApi = client.ExtensionsV1beta1Api()
        autoscalingApi = client.AutoscalingV1Api()

        watch_resource_in_process(coreApi.list_namespaced_pod)
        watch_resource_in_process(coreApi.list_namespaced_config_map)
        watch_resource_in_process(coreApi.list_namespaced_endpoints)
        watch_resource_in_process(coreApi.list_namespaced_resource_quota)
        watch_resource_in_process(coreApi.list_namespaced_secret)
        watch_resource_in_process(coreApi.list_namespaced_service_account)
        watch_resource_in_process(coreApi.list_namespaced_service)
        watch_resource_in_process(appsApi.list_namespaced_deployment)
        watch_resource_in_process(appsApi.list_namespaced_replica_set)
        watch_resource_in_process(appsApi.list_namespaced_stateful_set)
        watch_resource_in_process(extensionsApi.list_namespaced_ingress)
        watch_resource_in_process(autoscalingApi.list_namespaced_horizontal_pod_autoscaler)

        while True:
            if not self.control_queue.empty():
                control_event = self.control_queue.get()
                if control_event == 'stop':
                    self.stop(watchers)
                    break

            if self.queue.empty():
                time.sleep(1)
                continue

            event = self.queue.get()

            self.process_event(event)
            self._inform_role_manager_if_appropriate()
            # logger.info('resources are now: %s', pformat(self.resources))

        logger.info('resource manager stopped')

    def stop(self, watchers):
        logger.info('stopping watchers')
        for watcher, process in watchers:
            watcher.stop()
            process.terminate()
            process.join()

        self.queue.close()
        self.queue.join_thread()

        self.queue.join_thread()
