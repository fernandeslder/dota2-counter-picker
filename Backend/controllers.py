from flask import jsonify, request
from app import app
import services


@app.route('/getHeroData', methods=['POST'])
def index():
    hero_list = request.json.get('hero_list', [])
    return jsonify({'message': 'message'})


@app.route('/')
def index1():
    return jsonify({'message': 'message'})
