from flask import Flask
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
app = Flask(__name__, static_folder='dota2-counter-picker-frontend/build', static_url_path='')
CORS(app)
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["2400 per day", "200 per hour"]
)


from controllers import *
import logging
import logging.handlers
logging.basicConfig(level=logging.DEBUG,
                    handlers=[logging.handlers.RotatingFileHandler('logs/app.log', maxBytes=500*1024, backupCount=2, encoding='utf-8'),
                              logging.StreamHandler()],
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')


if __name__ == '__main__':
    app.run()
