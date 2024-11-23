import os
from flask import Flask, render_template, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    pass

db = SQLAlchemy(model_class=Base)
app = Flask(__name__)

app.secret_key = os.environ.get("FLASK_SECRET_KEY") or "a secret key"
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL")
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}
db.init_app(app)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/polygons', methods=['GET'])
def get_polygons():
    from models import Polygon
    polygons = Polygon.query.all()
    return jsonify([{
        'id': p.id,
        'name': p.name,
        'coordinates': p.coordinates,
        'height': p.height,
        'fill_color': p.fill_color,
        'stroke_color': p.stroke_color,
        'stroke_width': p.stroke_width
    } for p in polygons])

@app.route('/api/polygons', methods=['POST'])
def create_polygon():
    from models import Polygon
    data = request.json
    polygon = Polygon(
        name=data['name'],
        coordinates=data['coordinates'],
        height=data['height'],
        fill_color=data['fill_color'],
        stroke_color=data['stroke_color'],
        stroke_width=data['stroke_width']
    )
    db.session.add(polygon)
    db.session.commit()
    return jsonify({'id': polygon.id}), 201

@app.route('/api/polygons/<int:id>', methods=['PUT'])
def update_polygon(id):
    from models import Polygon
    polygon = Polygon.query.get_or_404(id)
    data = request.json
    polygon.name = data['name']
    polygon.coordinates = data['coordinates']
    polygon.height = data['height']
    polygon.fill_color = data['fill_color']
    polygon.stroke_color = data['stroke_color']
    polygon.stroke_width = data['stroke_width']
    db.session.commit()
    return '', 204

with app.app_context():
    import models
    db.create_all()
