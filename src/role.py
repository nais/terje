import signal
import time
from collections import defaultdict
from multiprocessing import Process
from pprint import pformat

from kubernetes import client
from kubernetes.client.rest import ApiException

from logger import get_logger

DEFAULT_ADMIN_VERBS = ['create', 'update', 'patch', 'delete']

logger = get_logger(__name__)


# Brute force way of getting all resource definitions from all 'preferred apis'. Used to specify correct 'verbs' for
# each resource 'kind'.
def get_api_resources():
    api_resources = defaultdict(list)
    apiClient = client.ApiClient()

    def _generic_api_get(path, response_type):
        return apiClient.call_api(path, 'GET', response_type=response_type, auth_settings=['BearerToken'])[0]

    client.AppsV1Api().get_api_resources()
    apis = _generic_api_get('/apis', 'V1APIGroupList')

    for api in apis.groups:
        api_url = api.preferred_version.group_version
        resourceList = _generic_api_get('/apis/' + api_url, 'V1APIResourceList')

        for resource in resourceList.resources:
            api_resources[resource.kind].append(resource)

    return api_resources


class RoleManager(Process):
    def __init__(self, namespace, role_manager_control_queue, resources_inform_queue):
        Process.__init__(self)

        self.api = client.RbacAuthorizationV1Api()
        self.namespace = namespace
        self.control_queue = role_manager_control_queue
        self.resources_inform_queue = resources_inform_queue
        self.api_resources = get_api_resources()

    def _create_rule_definitions_for_kind(self, kind, resource_names):
        rules = []
        for api_resource in self.api_resources[kind]:
            rules.append(client.V1PolicyRule(
                api_groups=['*'],
                resources=[api_resource.name],
                resource_names=resource_names,
                verbs=api_resource.verbs,
            ))

        return rules

    def _create_rule_definitions_for_team(self, team_resources):
        rules = []
        for resource_kind, resource_names in team_resources.items():
            rules += self._create_rule_definitions_for_kind(resource_kind, resource_names)

        return rules

    def _create_role_definition(self, namespace, team, team_resources):
        return client.V1Role(
            metadata=client.V1ObjectMeta(namespace=namespace, name='team-' + team),
            rules=self._create_rule_definitions_for_team(team_resources)
        )

    def _create_or_update_role(self, role):
        name = role.metadata.name
        namespace = role.metadata.namespace

        try:
            if self.api.read_namespaced_role(name, namespace):
                return self.api.patch_namespaced_role(name, namespace, role)
        except ApiException:
            return self.api.create_namespaced_role(namespace, role)

    def _create_roles(self, all_resources):
        created_roles = []
        for team, team_resources in all_resources.items():
            role = self._create_role_definition(self.namespace, team, team_resources)

            logger.info('role: %s', role)
            # created_roles.append(self._create_or_update_role(role))

        return created_roles

    def run(self):
        # Shouls be stopped by operator thread posting to control_queue instead.
        signal.signal(signal.SIGINT, signal.SIG_IGN)

        while True:
            if not self.control_queue.empty():
                control_event = self.control_queue.get()
                if control_event == 'stop':
                    break

            if self.resources_inform_queue.empty():
                time.sleep(1)
                continue

            all_resources = self.resources_inform_queue.get()
            logger.info('created roles: %s', pformat(self._create_roles(all_resources)))
        logger.info('role manager stopped')
