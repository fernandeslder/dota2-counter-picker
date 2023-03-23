from flask import make_response
import logging
logger = logging.getLogger(__name__)


def json_success_response(response_data):
    response_json = {
        'status': 'success',
        'data': response_data
    }

    response = make_response(response_json, 200)
    response.headers['Content-Type'] = 'application/json'
    return response


def error_response(e):
    logger.error('An error occurred', exc_info=True)
    response_json = {
        'status': 'error',
        'message': f'{type(e).__name__}:: Caused by {str(e)}'
    }
    response = make_response(response_json, 500)
    response.headers['Content-Type'] = 'application/json'
    return response
