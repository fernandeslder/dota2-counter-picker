from flask import Flask
from flask_cors import CORS
app = Flask(__name__)
CORS(app)

from controllers import *
import logging
logging.basicConfig(level=logging.DEBUG,
                    handlers=[logging.FileHandler('logs/app.log', encoding='utf-8'), logging.StreamHandler()],
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

if __name__ == '__main__':
    app.run()
