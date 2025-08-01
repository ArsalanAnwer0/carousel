import os
import uuid
from werkzeug.utils import secure_filename
from PIL import Image
from config import Config

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in Config.ALLOWED_EXTENSIONS

def save_uploaded_file(file):
    """Save uploaded file and return the file path"""
    print(f"DEBUG: File received: {file}, Filename: {file.filename if file else None}")
    
    if file and file.filename:
        result = allowed_file(file.filename)
        print(f"DEBUG: File allowed: {result}")
        
        if result:
            # Generate unique filename
            file_extension = file.filename.rsplit('.', 1)[1].lower()
            unique_filename = f"{uuid.uuid4()}.{file_extension}"
            
            # Save file
            file_path = os.path.join(Config.UPLOAD_FOLDER, unique_filename)
            print(f"DEBUG: Saving to: {file_path}")
            file.save(file_path)
            
            # Optimize image
            optimize_image(file_path)
            
            return f"/uploads/{unique_filename}"
    
    print("DEBUG: File validation failed")
    return None

def optimize_image(file_path, max_size=(800, 800)):
    """Optimize image size and quality"""
    try:
        with Image.open(file_path) as img:
            # Convert to RGB if necessary
            if img.mode in ('RGBA', 'P'):
                img = img.convert('RGB')
            
            # Resize if image is too large
            img.thumbnail(max_size, Image.Resampling.LANCZOS)
            
            # Save with optimized quality
            img.save(file_path, optimize=True, quality=85)
    except Exception as e:
        print(f"Error optimizing image: {e}")