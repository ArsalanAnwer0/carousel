from flask import Blueprint, request, jsonify, send_from_directory
from models.pin import Pin
from utils.file_handler import save_uploaded_file
from config import Config
import os

pins_bp = Blueprint('pins', __name__)

# Initialize Pin model
pin_model = Pin(Config.MONGODB_URI)

@pins_bp.route('/api/pins', methods=['GET'])
def get_pins():
    """Get all pins"""
    try:
        pins = pin_model.get_all_pins()
        return jsonify({'success': True, 'pins': pins})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@pins_bp.route('/api/pins', methods=['POST'])
def create_pin():
    """Create a new pin"""
    try:
        # Check if request has file part
        if 'image' not in request.files:
            return jsonify({'success': False, 'error': 'No image file provided'}), 400
        
        file = request.files['image']
        title = request.form.get('title', '').strip()
        tags = request.form.get('tags', '').strip()
        
        # Validate inputs
        if not title:
            return jsonify({'success': False, 'error': 'Title is required'}), 400
        
        if file.filename == '':
            return jsonify({'success': False, 'error': 'No image selected'}), 400
        
        # Save file
        image_url = save_uploaded_file(file)
        if not image_url:
            return jsonify({'success': False, 'error': 'Invalid file format'}), 400
        
        # Convert relative URL to full URL for frontend
        if image_url.startswith('/uploads/'):
            full_image_url = f"http://localhost:5001{image_url}"
        else:
            full_image_url = image_url
        
        # Process tags
        tag_list = [tag.strip() for tag in tags.split(',') if tag.strip()] if tags else []
        
        # Create pin in database
        pin_id = pin_model.create_pin(title, image_url, tag_list)
        
        return jsonify({
            'success': True, 
            'message': 'Pin created successfully',
            'pin_id': pin_id
        }), 201
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@pins_bp.route('/api/pins/<pin_id>', methods=['GET'])
def get_pin(pin_id):
    """Get a specific pin by ID"""
    try:
        pin = pin_model.get_pin_by_id(pin_id)
        if pin:
            return jsonify({'success': True, 'pin': pin})
        else:
            return jsonify({'success': False, 'error': 'Pin not found'}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@pins_bp.route('/api/pins/<pin_id>', methods=['DELETE'])
def delete_pin(pin_id):
    """Delete a pin by ID"""
    try:
        success = pin_model.delete_pin(pin_id)
        if success:
            return jsonify({'success': True, 'message': 'Pin deleted successfully'})
        else:
            return jsonify({'success': False, 'error': 'Pin not found'}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@pins_bp.route('/uploads/<filename>')
def uploaded_file(filename):
    """Serve uploaded files"""
    return send_from_directory(Config.UPLOAD_FOLDER, filename)

# ===== NEW ENDPOINTS FOR FRONTEND INTEGRATION =====

@pins_bp.route('/api/images', methods=['GET'])
def get_images():
    """Get all images for the gallery (maps to pins for frontend compatibility)"""
    try:
        pins = pin_model.get_all_pins()
        
        # Transform pins to match frontend expectations
        images = []
        for pin in pins:
            # Handle different possible ID formats
            pin_id = str(pin.get('_id', pin.get('id', '')))
            
            # Get image URL and convert to full URL
            image_url = pin.get('image_url', '')
            if image_url and image_url.startswith('/uploads/'):
                # Convert relative URL to full backend URL
                full_image_url = f"http://localhost:5001{image_url}"
            else:
                full_image_url = image_url
            
            images.append({
                "id": pin_id,
                "url": full_image_url,
                "thumbnail": full_image_url,  # Use same URL for thumbnail
                "title": pin.get('title', ''),
                "description": pin.get('description', ''),
                "tags": pin.get('tags', []),
                "uploadDate": pin.get('created_at', ''),
                "size": pin.get('file_size', 0),
                "filename": pin.get('filename', ''),
                "likes": pin.get('likes', 0),
                "views": pin.get('views', 0)
            })
        
        # Get pagination parameters
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 20, type=int)
        
        # Calculate pagination
        total = len(images)
        start = (page - 1) * limit
        end = start + limit
        paginated_images = images[start:end]
        
        return jsonify({
            "images": paginated_images,
            "total": total,
            "page": page,
            "totalPages": (total + limit - 1) // limit,  # Ceiling division
            "hasMore": end < total
        })
        
    except Exception as e:
        print(f"Error fetching images: {str(e)}")  # Debug logging
        return jsonify({
            "images": [],
            "total": 0,
            "page": 1,
            "totalPages": 0,
            "hasMore": False,
            "error": str(e)
        }), 500

@pins_bp.route('/api/upload', methods=['POST'])
def upload_image():
    """Upload endpoint that maps to create_pin (for frontend compatibility)"""
    try:
        # Check if request has file part
        if 'image' not in request.files:
            return jsonify({'success': False, 'error': 'No image file provided'}), 400
        
        file = request.files['image']
        title = request.form.get('title', '').strip()
        description = request.form.get('description', '').strip()
        tags_input = request.form.get('tags', '').strip()
        
        # Use filename as title if no title provided
        if not title:
            title = file.filename or 'Untitled'
        
        if file.filename == '':
            return jsonify({'success': False, 'error': 'No image selected'}), 400
        
        # Save file
        image_url = save_uploaded_file(file)
        if not image_url:
            return jsonify({'success': False, 'error': 'Invalid file format'}), 400
        
        # FIX: Convert relative URL to full URL (this was missing!)
        if image_url.startswith('/uploads/'):
            full_image_url = f"http://localhost:5001{image_url}"
        else:
            full_image_url = image_url
        
        # Process tags - handle both comma-separated strings and JSON arrays
        tag_list = []
        if tags_input:
            try:
                # Try to parse as JSON array first
                import json
                tag_list = json.loads(tags_input)
            except:
                # Fallback to comma-separated string
                tag_list = [tag.strip() for tag in tags_input.split(',') if tag.strip()]
        
        # Create pin in database
        pin_id = pin_model.create_pin(title, image_url, tag_list)
        
        # Return frontend-compatible response
        return jsonify({
            'id': str(pin_id),
            'url': full_image_url,  # Now this variable exists!
            'title': title,
            'description': description,
            'tags': tag_list,
            'uploadDate': '',  # Will be set by the database
            'size': 0,  # Could calculate actual file size if needed
            'filename': file.filename
        }), 201
    
    except Exception as e:
        print(f"Error uploading image: {str(e)}")  # Debug logging
        return jsonify({'success': False, 'error': str(e)}), 500


@pins_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "message": "Pins API is running!",
        "endpoints": [
            "/api/pins",
            "/api/images", 
            "/api/upload"
        ]
    })