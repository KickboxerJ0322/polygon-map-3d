from app import db
from flask_login import UserMixin

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    google_id = db.Column(db.String(100), unique=True)
    email = db.Column(db.String(100), unique=True)
    name = db.Column(db.String(100))

class Polygon(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    coordinates = db.Column(db.JSON, nullable=False)
    height = db.Column(db.Float, nullable=False)
    fill_color = db.Column(db.String(50), nullable=False)
    fill_opacity = db.Column(db.Float, nullable=False, default=0.5)
    stroke_color = db.Column(db.String(50), nullable=False)
    stroke_opacity = db.Column(db.Float, nullable=False, default=1.0)
    stroke_width = db.Column(db.Integer, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    user = db.relationship('User', backref='polygons')
