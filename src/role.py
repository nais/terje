import signal
import time
from collections import defaultdict
from multiprocessing import Process

from kubernetes import client
from kubernetes.client.rest import ApiException

from logger import get_logger

DEFAULT_ADMIN_VERBS = ['create', 'update', 'patch', 'delete']

logger = get_logger(__name__)


def role_summary(role):
    return ''.join("{}{{{}}}".format(rule.resources[0], ','.join(rule.resource_names)) for rule in role.rules)


# Convert resource names like 'deployments/status' to 'deployments'
def strip_subname(resource_name_and_subname):
    return resource_name_and_subname.split('/')[0]


# Brute force way of getting all resource definitions from all 'preferred apis'. Used to specify correct 'verbs' for
# each resource 'kind'.
def get_api_resources():
    api_resources = defaultdict(set)
    api_client = client.ApiClient()

    def _generic_api_get(path, response_type):
        return api_client.call_api(path, 'GET', response_type=response_type, auth_settings=['BearerToken'])[0]

    client.AppsV1Api().get_api_resources()
    apis = _generic_api_get('/apis', 'V1APIGroupList')

    for api in apis.groups:
        api_url = api.preferred_version.group_version
        resource_list = _generic_api_get('/apis/' + api_url, 'V1APIResourceList')

        for resource in resource_list.resources:
            api_resources[resource.kind].add(strip_subname(resource.name))

    # Core api needs special treatment because it's on a different path for some reason.
    for resource in _generic_api_get('/api/v1', 'V1APIResourceList').resources:
        api_resources[resource.kind].add(strip_subname(resource.name))

    return api_resources


class RoleManager(Process):
    def __init__(self, namespace, role_manager_control_queue, resources_inform_queue):
        Process.__init__(self)

        self.api = client.RbacAuthorizationV1Api()
        self.namespace = namespace
        self.control_queue = role_manager_control_queue
        self.resources_inform_queue = resources_inform_queue
        self.api_resources = get_api_resources()

    def create_rule_definitions_for_team(self, team_resources):
        for resource_kind, resource_names in team_resources.items():
            if len(resource_names) > 0:
                yield client.V1PolicyRule(
                    api_groups=['*'],
                    resources=list(self.api_resources[resource_kind]),
                    resource_names=list(resource_names),
                    verbs=['*'])

    def create_role_definition(self, namespace, team, team_resources):
        return client.V1Role(
            metadata=client.V1ObjectMeta(namespace=namespace, name='team-' + team),
            rules=list(self.create_rule_definitions_for_team(team_resources))
        )

    def create_or_update_role(self, role):
        name = role.metadata.name
        namespace = role.metadata.namespace

        try:
            return self.api.create_namespaced_role(namespace, role)
        except ApiException:
            return self.api.patch_namespaced_role(name, namespace, role)

    def create_roles(self, all_resources):
        created_roles = []
        for team, team_resources in all_resources.items():
            role = self.create_role_definition(self.namespace, team, team_resources)

            if role:
                created_role = self.create_or_update_role(role)
                created_roles.append(created_role)

        return created_roles

    def run(self):
        # Should be stopped by operator thread posting to control_queue instead.
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
            created_roles = self.create_roles(all_resources)

            for role in created_roles:
                logger.info('created role %s: %s', role.metadata.name, role_summary(role))

        logger.info('role manager stopped')
