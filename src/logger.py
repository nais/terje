import logging
import sys

from pythonjsonlogger import jsonlogger


def get_logger(name):
    logger = logging.getLogger(name)

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(jsonlogger.JsonFormatter())

    logger.addHandler(handler)
    logger.propagate = False

    return logger
