from collections import defaultdict
from pprint import pprint

from kubernetes import client

from operator import get_logger

DEFAULT_ADMIN_VERBS = ["update", "delete"]
DEFAULT_VIEWER_VERBS = ["get", "list"]

logger = get_logger(__name__)


def merge_metadata(old, new):
    return new


def merge_rules(old, new):
    return new


class FakeRbacApi:
    def __init__(self):
        self._roles = defaultdict(client.V1Role)

    def read_namespaced_role(self, name, namespace):
        return self._roles.get(namespace).get(name, None)

    def patch_namespaced_role(self, name, namespace, role):
        existing = self.read_namespaced_role(name, namespace)
        return self.create_namespaced_role(namespace, client.V1Role(
            merge_metadata(existing.metadata, role.metadata),
            merge_rules(existing.rules, role.rules)
        ))

    def create_namespaced_role(self, namespace, role):
        self._roles[namespace][role.metadata.name] = role
        return True


class RoleManager:
    def __init__(self, namespace):
        self.api = FakeRbacApi()
        self.namespace = namespace

    @staticmethod
    def _create_role_definition(namespace, team, resources):
        rules = []
        for resourceType, resourceNames in resources.items():
            rules.append({
                "resources": [resourceType],
                "resourceNames": resourceNames,
                "verbs": DEFAULT_ADMIN_VERBS,
            })

        role = client.V1Role(
            metadata={
                "namespace": namespace,
                "name": "team-" + team,
            },
            rules=rules
        )

        return role

    def create_team_roles(self, teams_with_resources):
        for team, resources in teams_with_resources.items():
            pprint(RoleManager._create_role_definition(self.namespace, team, resources))

    def create_or_update_role(self, role):
        name = role.metadata.name
        namespace = role.metadata.namespace

        if self.api.read_namespaced_role(name, namespace):
            return self.api.patch_namespaced_role(name, namespace, role)

        return self.api.create_namespaced_role(namespace, role)
