from app import db

class Polygon(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    coordinates = db.Column(db.JSON, nullable=False)
    height = db.Column(db.Float, nullable=False)
    fill_color = db.Column(db.String(50), nullable=False)
    fill_opacity = db.Column(db.Float, nullable=False, default=0.2)
    stroke_color = db.Column(db.String(50), nullable=False)
    stroke_opacity = db.Column(db.Float, nullable=False, default=1.0)
    stroke_width = db.Column(db.Integer, nullable=False)
