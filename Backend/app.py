from flask import Flask
from flask_cors import CORS
from scheduler import scheduler
from controllers import *
import logging
import logging.handlers
logging.basicConfig(level=logging.DEBUG,
                    handlers=[logging.handlers.RotatingFileHandler('logs/app.log', maxBytes=500*1024, backupCount=2, encoding='utf-8'),
                              logging.StreamHandler()],
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

app = Flask(__name__)
CORS(app)

if __name__ == '__main__':
    scheduler.start()
    app.run()
