from flask import jsonify, request
from app import app
import services
import utils
import logging
logger = logging.getLogger(__name__)


@app.route('/getHeroData', methods=['POST'])
def get_hero_data():
    try:
        logger.info("In get_hero_data Endpoint")
        hero_list = request.json.get('hero_list', [])
        logger.info(f"Hero List: {hero_list}")
        hero_data = services.final_data(hero_list)
        logger.info("Successfully fetched final_data")
        return utils.json_success_response(hero_data)
    except Exception as e:
        return utils.error_response(e)


@app.route('/syncData')
def sync_data():
    try:
        logger.info("In sync_data Endpoint")
        services.sync_data()
        logger.info("Successfully Synced Data")
        return utils.json_success_response("Successfully Synced Data")
    except Exception as e:
        return utils.error_response(e)
