from flask import Flask
from flask_cors import CORS
from routes.pins import pins_bp
from config import Config

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Enable CORS for all routes
    CORS(app)
    
    # Register blueprints
    app.register_blueprint(pins_bp)
    
    @app.route('/')
    def health_check():
        return {'status': 'healthy', 'message': 'Carousel API is running!'}
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5000, debug=True)