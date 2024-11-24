import os
from flask import Flask, render_template, jsonify, request, redirect, url_for, session
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase
from flask_login import LoginManager, current_user, login_user, logout_user, login_required
from authlib.integrations.flask_client import OAuth
from flask_migrate import Migrate
from werkzeug.utils import redirect
from flask_migrate import Migrate

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

# Initialize Flask extensions
db.init_app(app)
migrate = Migrate(app, db)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

# Initialize OAuth
oauth = OAuth(app)
oauth.register(
    name='google',
    client_id=os.environ.get('GOOGLE_OAUTH_CLIENT_ID'),
    client_secret=os.environ.get('GOOGLE_OAUTH_CLIENT_SECRET'),
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={
        'scope': 'openid email profile'
    }
)

@login_manager.user_loader
def load_user(user_id):
    from models import User
    return User.query.get(int(user_id))

@app.route('/login')
def login():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    redirect_uri = url_for('oauth_callback', _external=True)
    return oauth.google.authorize_redirect(redirect_uri)

@app.route('/logout')
def logout():
    logout_user()
    return redirect(url_for('index'))

@app.route('/oauth-callback')
def oauth_callback():
    try:
        token = oauth.google.authorize_access_token()
        user_info = oauth.google.parse_id_token(token)
        
        from models import User
        user = User.query.filter_by(google_id=user_info['sub']).first()
        
        if not user:
            user = User(
                google_id=user_info['sub'],
                email=user_info['email'],
                name=user_info['name']
            )
            db.session.add(user)
            db.session.commit()
        
        login_user(user)
        return redirect(url_for('index'))
    except Exception as e:
        print(f"OAuth callback error: {str(e)}")
        return redirect(url_for('login'))

@app.route('/')
@login_required
def index():
    maps_api_key = os.environ.get('GOOGLE_MAPS_API_KEY')
    if not maps_api_key:
        return "Google Maps API key is not configured", 500
    return render_template('index.html', maps_api_key=maps_api_key, user=current_user)

@app.route('/api/polygons', methods=['GET'])
@login_required
def get_polygons():
    from models import Polygon
    polygons = Polygon.query.filter_by(user_id=current_user.id).all()
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
@login_required
def create_polygon():
    from models import Polygon
    data = request.json
    polygon = Polygon()
    polygon.name = data.get('name', 'Unnamed Polygon')
    polygon.user_id = current_user.id
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
@login_required
def update_polygon(id):
    from models import Polygon
    polygon = Polygon.query.filter_by(id=id, user_id=current_user.id).first_or_404()
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
@login_required
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
