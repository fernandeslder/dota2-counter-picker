from flask import Flask
app = Flask(__name__)
from controllers import *
import logging
logging.basicConfig(level=logging.DEBUG,
                    handlers=[logging.FileHandler('logs/app.log', encoding='utf-8'), logging.StreamHandler()],
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

if __name__ == '__main__':
    app.run()
