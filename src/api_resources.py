# Brute force way of getting all resource definitions from all 'preferred apis'. Used to specify correct 'verbs' for
# each resource 'kind'.
from collections import defaultdict

from kubernetes import client


# Convert resource names like 'deployments/status' to 'deployments'
def strip_subname(resource_name_and_subname):
    return resource_name_and_subname.split('/')[0]


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
