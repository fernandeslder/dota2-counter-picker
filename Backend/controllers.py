from flask import jsonify
from app import app
import services


@app.route('/')
def index():
    message = services.get_hello_message()
    return jsonify({'message': message})
