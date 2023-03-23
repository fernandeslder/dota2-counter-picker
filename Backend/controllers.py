from flask import request
from flask_cors import cross_origin
from app import app
import services
import utils
import logging
logger = logging.getLogger(__name__)


# Controller to get hero winrate, advantage and average enemy winrate data on input of enemy heroes as list
@app.route('/getHeroData', methods=['POST'])
@cross_origin()
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
