import unittest

from rolemanager import RoleManager


# Hard coded for tests, in-cluster this mapping is retrieved from the k8s api.
API_RESOURCES = {
    "Deployment": {"deployments"},
    "Pod": {"pods"},
    "Ingress": {"ingresses"},
    "ReplicaSet": {"replicasets"}
}


class FakeRbacClient:
    def create_namespaced_role(self, namespace, role):
        pass

    def patch_namespaced_role(self, name, namespace, role):
        pass


class TestRoleManager(unittest.TestCase):
    def setUp(self):
        self.rbacapi = FakeRbacClient()
        self.role_manager = RoleManager(self.rbacapi, "default", None, None, API_RESOURCES)

    def test_no_roles_if_no_resources(self):
        resources = {
        }
        generated_roles = list(self.role_manager.generate_roles(resources))
        self.assertEqual(len(generated_roles), 0, "No roles should be generated if no resources are present.")

    def test_role_with_correct_name_if_resources(self):
        resources = {
            "aura": {
                "Deployment":
                    {
                        "deployment-1",
                        "deployment-2",
                    }
            }
        }

        generated_roles = list(self.role_manager.generate_roles(resources))
        role = generated_roles[0]

        self.assertEqual(len(generated_roles), 1, "One role should be generated when one role is present in resources.")
        self.assertEqual("team-aura", role.metadata.name, "Role should be named team-{team_name}")

    def test_all_resource_names_present(self):
        resources = {
            "aura": {
                "Deployment":
                    {
                        "deployment-1",
                        "deployment-2",
                    }
            }
        }

        generated_roles = list(self.role_manager.generate_roles(resources))

        resource_names = generated_roles[0].rules[0].resource_names

        for resource_name in resources["aura"]["Deployment"]:
            self.assertIn(resource_name, resource_names, resource_name + " should be present in the rules list of ResourceNames")

    def test_all_resource_names_present_multiple_teams_and_resources(self):
        resources = {
            "aura": {
                "Deployment":
                    {
                        "deployment-1",
                        "deployment-2",
                    },
                "ReplicaSet":
                    {
                        "rs-1",
                    }
            },
            "bris": {
                "Ingress":
                    {
                        "ingress-1",
                        "ingress-2",
                        "ingress-3",
                    },
                "Pod":
                    {
                        "pod-asd-1",
                        "pod-sad-1",
                    }
            }
        }

        generated_roles = list(self.role_manager.generate_roles(resources))

        aura_deployments = [rule.resource_names for role in generated_roles for rule in role.rules if rule.resources == ["deployments"] if role.metadata.name == "team-aura"][0]
        aura_replicasets = [rule.resource_names for role in generated_roles for rule in role.rules if rule.resources == ["replicasets"] if role.metadata.name == "team-aura"][0]
        bris_ingresses = [rule.resource_names for role in generated_roles for rule in role.rules if rule.resources == ["ingresses"] if role.metadata.name == "team-bris"][0]
        bris_pods = [rule.resource_names for role in generated_roles for rule in role.rules if rule.resources == ["pods"] if role.metadata.name == "team-bris"][0]

        for resource_name in resources["aura"]["Deployment"]:
            self.assertIn(resource_name, aura_deployments, resource_name + " should be present in the rules list of ResourceNames")
        for resource_name in resources["aura"]["ReplicaSet"]:
            self.assertIn(resource_name, aura_replicasets, resource_name + " should be present in the rules list of ResourceNames")
        for resource_name in resources["bris"]["Ingress"]:
            self.assertIn(resource_name, bris_ingresses, resource_name + " should be present in the rules list of ResourceNames")
        for resource_name in resources["bris"]["Pod"]:
            self.assertIn(resource_name, bris_pods, resource_name + " should be present in the rules list of ResourceNames")
