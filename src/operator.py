#!/usr/bin/env python3
import logging
import os
import signal
from multiprocessing import Queue

from kubernetes import config

from logger import get_logger
from resource import ResourceManager
from role import RoleManager

logger = get_logger(__name__)

if bool(os.environ.get('TEAM_DEV_MODE', False)):
    config.load_kube_config()

    import urllib3

    urllib3.disable_warnings()
else:
    config.load_incluster_config()

if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)

    namespace = os.environ['APP_NAMESPACE']

    resource_manager_control_queue, role_manager_control_queue, resources_inform_queue = Queue(), Queue(), Queue()

    resource_manager = ResourceManager(namespace, resource_manager_control_queue, resources_inform_queue)
    resource_manager.start()

    role_manager = RoleManager(namespace, role_manager_control_queue, resources_inform_queue)
    role_manager.start()


    def signal_handler(sig, frame):
        logger.info('stopping resource manager')
        resource_manager_control_queue.put('stop')
        resource_manager_control_queue.close()
        resource_manager_control_queue.join_thread()
        resource_manager.join()

        logger.info('stopping role manager')
        role_manager_control_queue.put('stop')
        role_manager_control_queue.close()
        role_manager_control_queue.join_thread()
        role_manager.join()

        logger.info('stopping resources inform queue')
        resources_inform_queue.close()
        resources_inform_queue.join_thread()

        logger.info('stopping operator')
        import sys
        sys.exit(0)


    # This handler will be inherited by all processes spawned by the main process, capturing SIGINT for every process.
    signal.signal(signal.SIGINT, signal_handler)
