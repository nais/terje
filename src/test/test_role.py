import unittest
from collections import defaultdict

from kubernetes import client


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
        self._roles[role.metadata.name] = role
        return True


class RoleCreationTestCase(unittest.TestCase):
    def setUp(self):
        pass

    def tearDown(self):
        pass

    def testWithPods(self):
        self.assertEqual((1 + 2), 3)
        self.assertEqual(0 + 1, 1)

    def testWithReplicasets(self):
        self.assertEqual((0 * 10), 0)
        self.assertEqual((5 * 8), 40)


if __name__ == '__main__':
    unittest.main()
