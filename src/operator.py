#!/usr/bin/env python3
import logging
import os
import time

from kubernetes import config
from pythonjsonlogger import jsonlogger

from resource import ResourceManager
from role import RoleManager


def get_logger(name):
    logger = logging.getLogger(name)
    handler = logging.StreamHandler()
    handler.setFormatter(jsonlogger.JsonFormatter())
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)

    return logger


if bool(os.environ.get('TEAM_DEV_MODE', False)):
    config.load_kube_config()
else:
    config.load_incluster_config()

if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)

    role_manager = RoleManager(os.environ['APP_NAMESPACE'])
    resource_manager = ResourceManager(os.environ['APP_NAMESPACE'])

    while True:
        role_manager.create_team_roles(resource_manager.get_all_resources())
        time.sleep(10)
