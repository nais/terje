import signal
import time
from multiprocessing import Process

from kubernetes import client
from kubernetes.client.rest import ApiException

from logger import get_logger

DEFAULT_ADMIN_VERBS = ['create', 'update', 'patch', 'delete']

logger = get_logger(__name__)


class RoleManager(Process):
    def __init__(self, rbacapi, namespace, role_manager_control_queue, resources_inform_queue, api_resources):
        Process.__init__(self)

        self.api = rbacapi
        self.namespace = namespace
        self.control_queue = role_manager_control_queue
        self.resources_inform_queue = resources_inform_queue
        self.api_resources = api_resources

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
            generated_roles = self.generate_roles(all_resources)
            self.create_or_update_roles(generated_roles)

        logger.info('role manager stopped')

    def generate_roles(self, all_resources):
        for team, team_resources in all_resources.items():
            role = self.generate_role_definition(self.namespace, team, team_resources)

            if role:
                yield role

    def generate_role_definition(self, namespace, team, team_resources):
        return client.V1Role(
            metadata=client.V1ObjectMeta(namespace=namespace, name='team-' + team),
            rules=list(self.generate_rule_definitions_for_team(team_resources))
        )

    def generate_rule_definitions_for_team(self, team_resources):
        for resource_kind, resource_names in team_resources.items():
            if len(resource_names) > 0:
                yield client.V1PolicyRule(
                    api_groups=['*'],
                    resources=list(self.api_resources[resource_kind]),
                    resource_names=list(resource_names),
                    verbs=['*'])

    def create_or_update_roles(self, roles):
        return [self.create_or_update_role(role) for role in roles]

    def create_or_update_role(self, role):
        name = role.metadata.name

        try:
            return self.api.create_namespaced_role(self.namespace, role)
        except ApiException:
            return self.api.patch_namespaced_role(name, self.namespace, role)
