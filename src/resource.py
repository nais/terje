#!/usr/bin/env python3
from collections import defaultdict
from pprint import pprint

from kubernetes import client

from operator import get_logger

logger = get_logger(__name__)


# A dictionary that will creates empty lists as values on demand
def _dd_list():
    return defaultdict(list)


# A dictionary that will create empty dictionaries with empty lists on demand
def _dd_dd_list():
    return defaultdict(_dd_list)


def _safe_get_label(resource):
    if resource.metadata.labels is not None and 'team' in resource.metadata.labels.keys():
        return resource.metadata.labels['team']
    return None


# A function that takes a dictionary like:
# { 'pods':
#   [ { 'name': 'podName1'
#     , 'team': 'podOwner' }
#   , { 'name': 'podName2'
#     , 'team': 'podOwner' }
#   ]
# And turns it into:
# { 'podOwner':
#   { 'pods':
#     [ 'podName1'
#     , 'podName2' ]
#   }
# }
def _group_resources_by_team_and_type(resources_by_type):
    resources_by_team_and_type = _dd_dd_list()

    for resourceType, resources in resources_by_type.items():
        for resource in resources:
            team = _safe_get_label(resource)
            if team is not None:
                resources_by_team_and_type[team][resourceType].append(resource.metadata.name)

    return resources_by_team_and_type


class ResourceManager:
    def __init__(self, namespace):
        self.namespace = namespace
        self.coreApi = client.CoreV1Api()
        self.appsApi = client.AppsV1Api()
        self.extensionsApi = client.ExtensionsV1beta1Api()
        self.autoscalingApi = client.AutoscalingV1Api()

    def get_all_resources(self):
        return _group_resources_by_team_and_type({
            'pods': self.coreApi.list_namespaced_pod(self.namespace).items,
            'configmaps': self.coreApi.list_namespaced_config_map(self.namespace).items,
            'endpoints': self.coreApi.list_namespaced_endpoints(self.namespace).items,
            'resourcequotas': self.coreApi.list_namespaced_resource_quota(self.namespace).items,
            'secrets': self.coreApi.list_namespaced_secret(self.namespace).items,
            'serviceaccounts': self.coreApi.list_namespaced_service_account(self.namespace).items,
            'services': self.coreApi.list_namespaced_service(self.namespace).items,
            'deployments': self.appsApi.list_namespaced_deployment(self.namespace).items,
            'replicasets': self.appsApi.list_namespaced_replica_set(self.namespace).items,
            'statefulsets': self.appsApi.list_namespaced_stateful_set(self.namespace).items,
            'ingresses': self.extensionsApi.list_namespaced_ingress(self.namespace).items,
            'horizontalpodautoscalers': self.autoscalingApi.list_namespaced_horizontal_pod_autoscaler(
                self.namespace).items,
        })


if __name__ == '__main__':
    pprint(ResourceManager().get_all_resources())
