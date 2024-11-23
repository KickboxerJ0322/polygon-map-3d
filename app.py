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
        'fill_opacity': p.fill_opacity,
        'stroke_color': p.stroke_color,
        'stroke_opacity': p.stroke_opacity,
        'stroke_width': p.stroke_width
    } for p in polygons])

@app.route('/api/polygons', methods=['POST'])
def create_polygon():
    from models import Polygon
    data = request.json
    polygon = Polygon()
    polygon.name = data.get('name', 'Unnamed Polygon')
    polygon.coordinates = data.get('coordinates', [])
    polygon.height = data.get('height', 300)
    polygon.fill_color = data.get('fill_color', '#ff0000')
    polygon.fill_opacity = data.get('fill_opacity', 0.5)
    polygon.stroke_color = data.get('stroke_color', '#0000ff')
    polygon.stroke_opacity = data.get('stroke_opacity', 1.0)
    polygon.stroke_width = data.get('stroke_width', 3)
    
    db.session.add(polygon)
    db.session.commit()
    return jsonify({'id': polygon.id}), 201

@app.route('/api/polygons/<int:id>', methods=['PUT'])
def update_polygon(id):
    from models import Polygon
    polygon = Polygon.query.get_or_404(id)
    data = request.json
    
    # Update polygon with new values, keeping existing ones if not provided
    polygon.name = data.get('name', polygon.name)
    polygon.coordinates = data.get('coordinates', polygon.coordinates)
    polygon.height = data.get('height', polygon.height)
    polygon.fill_color = data.get('fill_color', polygon.fill_color)
    polygon.fill_opacity = data.get('fill_opacity', polygon.fill_opacity)
    polygon.stroke_color = data.get('stroke_color', polygon.stroke_color)
    polygon.stroke_opacity = data.get('stroke_opacity', polygon.stroke_opacity)
    polygon.stroke_width = data.get('stroke_width', polygon.stroke_width)
    
    db.session.commit()
    return '', 204


@app.route('/api/polygons/<int:id>', methods=['DELETE', 'PUT'])
def handle_polygon(id):
    from models import Polygon
    if request.method == 'PUT':
        try:
            polygon = Polygon.query.get_or_404(id)
            data = request.json
            
            # Update polygon attributes
            polygon.name = data.get('name', polygon.name)
            polygon.coordinates = data.get('coordinates', polygon.coordinates)
            polygon.height = data.get('height', polygon.height)
            polygon.fill_color = data.get('fill_color', polygon.fill_color)
            polygon.stroke_color = data.get('stroke_color', polygon.stroke_color)
            polygon.stroke_width = data.get('stroke_width', polygon.stroke_width)
            
            db.session.commit()
            return jsonify(id=polygon.id), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 500
    elif request.method == 'DELETE':
        try:
            polygon = Polygon.query.get_or_404(id)
            db.session.delete(polygon)
            db.session.commit()
            return '', 204
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 500

with app.app_context():
    import models
    db.create_all()
