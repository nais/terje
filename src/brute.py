from kubernetes import config

from role import get_api_resources

if __name__ == '__main__':
    import urllib3

    urllib3.disable_warnings()
    config.load_kube_config()

    print(get_api_resources())
